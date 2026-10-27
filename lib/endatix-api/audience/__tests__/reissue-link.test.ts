import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience } from "../audience";

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("Audience link reissue", () => {
  it("reissues one participant's link and maps the id to a string", async () => {
    const post = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success({ membershipId: 31, token: "new-token" }),
      );

    const result = await audienceWith({ post }).reissueLink(
      FORM_ID,
      MEMBERSHIP_ID,
    );

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/people/${MEMBERSHIP_ID}/link/reissue`,
      {},
    );
    expect(result.success && result.data).toEqual({
      membershipId: "31",
      token: "new-token",
    });
  });

  it("refuses a membership id that is not an Endatix id, without a call", async () => {
    const post = vi.fn();

    const result = await audienceWith({ post }).reissueLink(FORM_ID, "abc");

    expect(result.success).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});
