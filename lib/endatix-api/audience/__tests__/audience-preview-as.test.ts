import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience, buildListAudiencePeopleEndpoint } from "../audience";

// Preview as (endatix-hub#1181): people search and one participant's values.

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
