import { describe, expect, it } from "vitest";
import { importOptionsOf } from "../overwrite-rules";

describe("importOptionsOf", () => {
  it("reads the options an import was started with", () => {
    expect(
      importOptionsOf({ emptyCells: "clear", missingProperties: "keep" }),
    ).toEqual({ emptyCells: "clear", missingProperties: "keep" });
  });

  it("keeps values for an import from an API that sends no options", () => {
    expect(importOptionsOf({})).toEqual({
      emptyCells: "keep",
      missingProperties: "keep",
    });
  });
});
