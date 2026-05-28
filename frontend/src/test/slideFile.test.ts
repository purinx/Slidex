import { describe, expect, it } from "vitest";
import { buildSlidesFromFileNames, parseSlideFileName } from "../domain/slideFile";

describe("slideFile", () => {
  it("parses slide order and title from a valid file name", () => {
    expect(parseSlideFileName("03__Proposal.html")).toEqual({
      order: 3,
      orderText: "03",
      title: "Proposal",
      fileName: "03__Proposal.html"
    });
  });

  it("ignores index.html and invalid names", () => {
    expect(parseSlideFileName("index.html")).toBeNull();
    expect(parseSlideFileName("intro.html")).toBeNull();
  });

  it("sorts slides and reports duplicate orders", () => {
    const result = buildSlidesFromFileNames(
      ["02__Second.html", "01__First.html", "02__Duplicate.html"],
      (fileName) => `/slides/${fileName}`
    );

    expect(result.slides.map((slide) => slide.orderText)).toEqual(["01", "02"]);
    expect(result.warnings).toHaveLength(1);
  });
});
