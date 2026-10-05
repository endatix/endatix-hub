import { describe, expect, it } from "vitest";
import { describeCollectionStatus } from "../../ui/describe-collection-status";

describe("describeCollectionStatus", () => {
  it("maps a built-in code to its tone and label", () => {
    // Act & Assert
    expect(describeCollectionStatus("COMPLETE", false)).toEqual({
      tone: "on",
      label: "Complete",
    });
    expect(describeCollectionStatus(" expired ", true)).toEqual({
      tone: "attention",
      label: "Expired",
    });
  });

  it("falls back to isComplete when no code is supplied", () => {
    // Act & Assert
    expect(describeCollectionStatus(undefined, true).label).toBe("Complete");
    expect(describeCollectionStatus("  ", false).label).toBe("In progress");
  });

  it("renders an unknown code as itself in the off tone", () => {
    // Act & Assert
    expect(describeCollectionStatus("panel_hold", true)).toEqual({
      tone: "off",
      label: "panel_hold",
    });
  });
});
