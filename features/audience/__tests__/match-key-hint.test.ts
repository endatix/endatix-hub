import { describe, expect, it } from "vitest";
import { matchKeyHint } from "../update-settings/use-match-key.hook";

describe("matchKeyHint", () => {
  it("says why the match key cannot change, or when it will lock", () => {
    expect(matchKeyHint({ isLocked: true, canManage: true })).toMatch(
      /^Locked while/,
    );
    expect(matchKeyHint({ isLocked: false, canManage: false })).toMatch(
      /manage organization settings/,
    );
    expect(matchKeyHint({ isLocked: false, canManage: true })).toMatch(
      /^Choose it before adding people/,
    );
  });
});
