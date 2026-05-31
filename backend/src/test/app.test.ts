import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { Env } from "../infra/env.js";
import { MockStorage } from "./mockStorage.js";

const env: Env = {
  port: 3000,
  awsRegion: "ap-northeast-1",
  slidesBucketName: "slides",
  slidesPrefix: "decks",
  uploadMaxFileSize: 20 * 1024 * 1024,
  uploadMaxDeckSize: 200 * 1024 * 1024,
  frontendDistDir: "/tmp/missing"
};

describe("backend app", () => {
  it("creates a deck without upload authorization", async () => {
    const app = createApp({ env, storage: new MockStorage() });
    const response = await app.request("/api/decks", {
      method: "POST",
      body: JSON.stringify({ title: "Demo", deckId: "demo" }),
      headers: { "Content-Type": "application/json" }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      deckId: "demo"
    });
  });

  it("creates upload URLs and completes a deck", async () => {
    const storage = new MockStorage();
    const app = createApp({ env, storage });
    const headers = {
      "Content-Type": "application/json"
    };
    const files = [
      { path: "01__Intro.html", size: 12, contentType: "text/html" },
      { path: "assets/logo.png", size: 4, contentType: "image/png" }
    ];

    const uploads = await app.request("/api/decks/demo/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify({ files })
    });

    expect(uploads.status).toBe(200);
    const uploadBody = await uploads.json();
    expect(uploadBody.deckId).toBe("demo");
    expect(uploadBody.uploads[0]).toMatchObject({
      path: "01__Intro.html",
      key: "decks/demo/01__Intro.html"
    });

    await storage.putObject({
      key: "decks/demo/01__Intro.html",
      body: "hello world!",
      contentType: "text/html"
    });
    await storage.putObject({
      key: "decks/demo/assets/logo.png",
      body: "logo",
      contentType: "image/png"
    });

    const complete = await app.request("/api/decks/demo/complete", {
      method: "POST",
      headers,
      body: JSON.stringify({
        files,
        metadata: { title: "Demo", description: "Demo deck" }
      })
    });

    expect(complete.status).toBe(200);
    expect(await complete.json()).toMatchObject({
      deckId: "demo",
      slides: 1,
      deckUrl: "/deck/demo"
    });

    const manifest = await app.request("/api/decks/demo/manifest");
    expect(manifest.status).toBe(200);
    expect(await manifest.json()).toMatchObject({
      deckId: "demo",
      ogImage: "/api/decks/demo/files/og/deck.svg",
      slides: [{ order: 1, title: "Intro" }]
    });
    expect(await storage.getObjectText("decks/demo/og/deck.svg")).toContain("<svg");

    const file = await app.request("/api/decks/demo/files/01__Intro.html");
    expect(file.status).toBe(302);
    expect(file.headers.get("location")).toBe("https://download.example.test/decks%2Fdemo%2F01__Intro.html");

    const ogImage = await app.request("/api/decks/demo/files/og/deck.svg");
    expect(ogImage.status).toBe(302);
    expect(ogImage.headers.get("location")).toBe("https://download.example.test/decks%2Fdemo%2Fog%2Fdeck.svg");

    await storage.putObject({
      key: "decks/demo/assets/manifest.json",
      body: "not a deck manifest",
      contentType: "application/json"
    });

    const decks = await app.request("/api/decks");
    expect(decks.status).toBe(200);
    expect(await decks.json()).toMatchObject({
      decks: [
        {
          deckId: "demo",
          title: "Demo",
          description: "Demo deck",
          ogImage: "/api/decks/demo/files/og/deck.svg",
          slideCount: 1
        }
      ]
    });
  });

  it("returns OGP HTML shell for deck routes", async () => {
    const storage = new MockStorage();
    await storage.putObject({
      key: "decks/demo/ogp.json",
      contentType: "application/json",
      body: JSON.stringify({
        deck: { title: "Demo", description: "Deck description" },
        slides: {
          "01": { title: "Intro", description: "Intro description" }
        }
      })
    });

    const app = createApp({ env, storage });
    const response = await app.request("/deck/demo?slide=01");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Intro description");
    expect(html).toContain('property="og:title"');
  });

  it("preserves frontend assets in OGP HTML shell", async () => {
    const frontendDistDir = await fs.mkdtemp(path.join(os.tmpdir(), "slidex-frontend-dist-"));
    await fs.writeFile(
      path.join(frontendDistDir, "index.html"),
      `<!doctype html>
<html lang="ja">
  <head>
    <title>SlideX</title>
    <script type="module" crossorigin src="/assets/index-test.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-test.css">
  </head>
  <body><div id="root"></div></body>
</html>`
    );

    try {
      const storage = new MockStorage();
      await storage.putObject({
        key: "decks/demo/ogp.json",
        contentType: "application/json",
        body: JSON.stringify({
          deck: { title: "Demo", description: "Deck description" },
          slides: {}
        })
      });

      const app = createApp({ env: { ...env, frontendDistDir }, storage });
      const response = await app.request("/deck/demo");
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("/assets/index-test.js");
      expect(html).toContain("/assets/index-test.css");
      expect(html).toContain('property="og:title"');
    } finally {
      await fs.rm(frontendDistDir, { recursive: true, force: true });
    }
  });
});
