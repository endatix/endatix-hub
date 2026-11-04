import { describe, expect, it } from "vitest";
import { getStoredViewOptions } from "../../../ui/details/submission-details-context";

describe("getStoredViewOptions on the server", () => {
  it("returns null when there is no window", () => {
    expect(getStoredViewOptions()).toBeNull();
  });
});
