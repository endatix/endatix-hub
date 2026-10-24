import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience } from "../audience";

const FORM_ID = "1525035735390879744";
const MEMBER_ID = "1526934587983265792";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("Audience participant preset", () => {
  it("reads one participant's values by audience member id", async () => {
    // Arrange
    const preset = {
      name: "ana@acme.test",
      description: "Participant",
      variables: { tier: "gold" },
    };
    const get = vi.fn().mockResolvedValue(ApiResult.success(preset));

    // Act
    const result = await audienceWith({ get }).getParticipantPreset(
      FORM_ID,
      MEMBER_ID,
    );

    // Assert
    expect(get).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/variables/participants/${MEMBER_ID}`,
    );
    expect(result.success && result.data).toEqual(preset);
  });

  it("rejects an invalid member id without calling the API", async () => {
    // Arrange
    const get = vi.fn();

    // Act
    const result = await audienceWith({ get }).getParticipantPreset(
      FORM_ID,
      "7/x",
    );

    // Assert
    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
