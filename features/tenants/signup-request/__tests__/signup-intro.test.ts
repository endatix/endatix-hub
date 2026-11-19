import { describe, expect, it } from "vitest";
import { signupIntro } from "../signup-intro";

describe("signupIntro", () => {
  it("is the original sentence with no brand pack", () => {
    expect(signupIntro({ shortName: "Endatix" }, true)).toBe(
      "Request access to an Endatix workspace.",
    );
  });

  it("needs no article under a pack", () => {
    expect(signupIntro({ shortName: "Example Forms" }, false)).toBe(
      "Request access to a workspace on Example Forms.",
    );
  });
});
