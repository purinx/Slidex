import { describe, expect, it } from "vitest";
import { validateDeckId } from "../domain/deckId.js";
import { buildManifest } from "../domain/manifest.js";
import { renderOgpHtml } from "../domain/ogp.js";
import { normalizeUploadPath } from "../domain/paths.js";
import { validateUploadFiles } from "../domain/uploadValidation.js";

describe("deckId", () => {
  it("accepts URL-safe deck IDs", () => {
    expect(validateDeckId("product_intro-01")).toBe("product_intro-01");
  });

  it("rejects unsafe deck IDs", () => {
    expect(() => validateDeckId("../secret")).toThrow("deckId");
  });
});

describe("paths", () => {
  it("normalizes relative upload paths", () => {
    expect(normalizeUploadPath("./assets\\logo.png")).toBe("assets/logo.png");
  });

  it("rejects traversal paths", () => {
    expect(() => normalizeUploadPath("assets/../secret.html")).toThrow("parent");
  });
});

describe("upload validation", () => {
  const limits = {
    maxFileSize: 20 * 1024 * 1024,
    maxDeckSize: 200 * 1024 * 1024
  };

  it("requires at least one valid HTML slide", () => {
    expect(() =>
      validateUploadFiles([{ path: "assets/logo.png", size: 8, contentType: "image/png" }], limits)
    ).toThrow("At least one");
  });

  it("rejects duplicate slide order", () => {
    expect(() =>
      validateUploadFiles(
        [
          { path: "01__Intro.html", size: 8, contentType: "text/html" },
          { path: "01__Again.html", size: 8, contentType: "text/html" }
        ],
        limits
      )
    ).toThrow("duplicated");
  });
});

describe("manifest", () => {
  it("builds ordered slide metadata", () => {
    const files = validateUploadFiles(
      [
        { path: "02__Second.html", size: 8, contentType: "text/html" },
        { path: "01__First.html", size: 8, contentType: "text/html" }
      ],
      { maxFileSize: 100, maxDeckSize: 1000 }
    );

    const manifest = buildManifest({
      deckId: "demo",
      files,
      metadata: { title: "Demo" },
      slidesPrefix: "decks"
    });

    expect(manifest.slides.map((slide) => slide.orderText)).toEqual(["01", "02"]);
    expect(manifest.slides[0]?.url).toBe("/api/decks/demo/files/01__First.html");
  });
});

describe("OGP", () => {
  it("escapes generated meta tag values", () => {
    const html = renderOgpHtml({
      entry: {
        title: `<script>alert("x")</script>`,
        description: "A & B"
      },
      url: "https://slides.example.test/deck/demo",
      appHtml: "<html><head></head><body></body></html>",
      defaultTitle: "SlideX"
    });

    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).not.toContain("<script>alert");
  });
});
