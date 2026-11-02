import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience, buildListAudiencePeopleEndpoint } from "../audience";

const FORM_ID = "1525035735390879744";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("people search", () => {
  it("sends a trimmed search, and leaves out a blank one", () => {
    expect(
      buildListAudiencePeopleEndpoint(FORM_ID, { search: "  maria@ " }),
    ).toBe(
      `/forms/${FORM_ID}/audience/people?page=1&pageSize=50&search=maria%40`,
    );
    expect(buildListAudiencePeopleEndpoint(FORM_ID, { search: "   " })).toBe(
      `/forms/${FORM_ID}/audience/people?page=1&pageSize=50`,
    );
  });
});

describe("one participant's variables", () => {
  it("reads one participant's values by member id", async () => {
    const preset = { name: "maria@acme.test", variables: { tier: "gold" } };
    const get = vi.fn().mockResolvedValue(ApiResult.success(preset));

    const result = await audienceWith({ get }).getParticipantVariables(
      FORM_ID,
      "7",
    );

    expect(get).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/variables/participants/7`,
    );
    expect(result.success && result.data).toEqual(preset);
  });

  it("rejects an invalid member id without calling the API", async () => {
    const get = vi.fn();

    const result = await audienceWith({ get }).getParticipantVariables(
      FORM_ID,
      "x",
    );

    expect(get).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});

describe("saving Test participant values", () => {
  it("puts the whole edited list and reads back the variables, real ones included", async () => {
    // Arrange
    const presets = [{ name: "maria@acme.test", variables: { tier: "gold" } }];
    const read = {
      variablePresets: null,
      coverage: { participants: { test: 1, real: 0 }, properties: [] },
      editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    };
    const put = vi.fn().mockResolvedValue(ApiResult.success(read));

    // Act
    const result = await audienceWith({ put }).saveTestParticipants(
      FORM_ID,
      presets,
    );

    // Assert
    expect(put).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/variables/test-participants`,
      { presets },
    );
    expect(result.success && result.data.readOnlyPresets).toEqual([]);
  });
});
