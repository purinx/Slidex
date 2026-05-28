import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { Env } from "../infra/env.js";
import { MockStorage } from "./mockStorage.js";

const env: Env = {
  port: 3000,
  awsRegion: "ap-northeast-1",
  slidesBucketName: "slides",
  slidesPrefix: "decks",
  uploadAdminToken: "secret",
  uploadMaxFileSize: 20 * 1024 * 1024,
  uploadMaxDeckSize: 200 * 1024 * 1024,
  frontendDistDir: "/tmp/missing"
};

describe("backend app", () => {
  it("requires admin authorization for upload endpoints", async () => {
    const app = createApp({ env, storage: new MockStorage() });
    const response = await app.request("/api/decks", {
      method: "POST",
      body: JSON.stringify({ title: "Demo" }),
      headers: { "Content-Type": "application/json" }
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" }
    });
  });

  it("creates upload URLs and completes a deck", async () => {
    const storage = new MockStorage();
    const app = createApp({ env, storage });
    const headers = {
      Authorization: "Bearer secret",
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
      slides: [{ order: 1, title: "Intro" }]
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
});
