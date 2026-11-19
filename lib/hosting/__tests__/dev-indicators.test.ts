import { describe, expect, it } from "vitest";
import { resolveDevIndicators } from "../dev-indicators";

describe("resolveDevIndicators", () => {
  it("returns an empty object when the variable is unset, keeping the Next.js default", () => {
    expect(resolveDevIndicators({})).toEqual({});
  });

  it.each(["", "true", "1", "banana"])(
    "keeps the default for %j",
    (value) => {
      expect(resolveDevIndicators({ HUB_DEV_INDICATORS: value })).toEqual({});
    },
  );

  it.each(["false", "FALSE", " false "])(
    "turns the indicator off for %j",
    (value) => {
      expect(resolveDevIndicators({ HUB_DEV_INDICATORS: value })).toEqual({
        devIndicators: false,
      });
    },
  );
});
