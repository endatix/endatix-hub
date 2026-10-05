import { describe, expect, it } from "vitest";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import {
  AUDIENCE_DATA_TYPES,
  CREATABLE_DATA_TYPES,
  dataTypeLabel,
} from "../utils";

describe("audience data types", () => {
  it("leaves choice types out of the create list until choices can be edited", () => {
    const creatable = CREATABLE_DATA_TYPES.map((entry) => entry.value);

    expect(creatable).not.toContain(AudienceDataType.SingleChoice);
    expect(creatable).not.toContain(AudienceDataType.MultipleChoice);
    expect(creatable).toHaveLength(AUDIENCE_DATA_TYPES.length - 2);
  });

  it("still labels existing choice properties", () => {
    expect(dataTypeLabel(AudienceDataType.MultipleChoice)).toBe(
      "Multiple choice",
    );
  });
});
