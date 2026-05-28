import { describe, expect, it } from "vitest";
import { getDeckIdFromPath, resolveSlideFromParam } from "../domain/urlState";
import type { Slide } from "../domain/slideManifest";

const slides: Slide[] = [
  { order: 1, orderText: "01", title: "One", fileName: "01__One.html", url: "/one" },
  { order: 2, orderText: "02", title: "Two", fileName: "02__Two.html", url: "/two" }
];

describe("urlState", () => {
  it("extracts a deck id from the route", () => {
    expect(getDeckIdFromPath("/deck/product-intro")).toBe("product-intro");
  });

  it("resolves current slide from a slide parameter", () => {
    expect(resolveSlideFromParam(slides, "02")?.title).toBe("Two");
    expect(resolveSlideFromParam(slides, "2")?.title).toBe("Two");
    expect(resolveSlideFromParam(slides, "99")?.title).toBe("One");
  });
});
