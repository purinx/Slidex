import { describe, expect, it } from "vitest";
import { validateUploadFiles } from "../domain/uploadValidation";

describe("uploadValidation", () => {
  it("requires at least one valid slide html file", () => {
    const result = validateUploadFiles([new File(["body"], "notes.txt")]);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("At least one");
  });

  it("accepts a valid slide file", () => {
    const result = validateUploadFiles([new File(["<h1>Hi</h1>"], "01__Intro.html", { type: "text/html" })]);
    expect(result.valid).toBe(true);
  });

  it("rejects duplicate slide orders", () => {
    const result = validateUploadFiles([
      new File(["a"], "01__Intro.html"),
      new File(["b"], "01__Again.html")
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("duplicates");
  });
});
