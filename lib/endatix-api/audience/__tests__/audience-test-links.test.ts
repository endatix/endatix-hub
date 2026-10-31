import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import { Audience } from "../audience";

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";

function audienceWith(methods: Partial<Record<string, unknown>>) {
  return new Audience(methods as unknown as EndatixApi);
}

describe("Audience test links", () => {
  const request = {
    membershipIds: [MEMBERSHIP_ID],
    runsEach: 2,
    expiryMinutes: 60,
  };

  it("asks for test links in one call and keeps the 64-bit ids as strings", async () => {
    const post = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: [
          {
            membershipId: MEMBERSHIP_ID,
            identifier: "tester@acme.test",
            run: 1,
            submissionId: 31,
            token: "t1",
            expiresAt: "2026-11-02T10:00:00Z",
          },
        ],
      }),
    );

    const result = await audienceWith({ post }).mintTestLinks(FORM_ID, request);

    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/test-links`,
      request,
    );
    expect(result.success && result.data).toEqual([
      {
        membershipId: MEMBERSHIP_ID,
        identifier: "tester@acme.test",
        run: 1,
        submissionId: "31",
        token: "t1",
        expiresAt: "2026-11-02T10:00:00Z",
      },
    ]);
  });

  it("sends null for every test participant", async () => {
    const post = vi.fn().mockResolvedValue(ApiResult.success({ items: [] }));

    await audienceWith({ post }).mintTestLinks(FORM_ID, {
      ...request,
      membershipIds: null,
    });

    expect(post).toHaveBeenCalledWith(`/forms/${FORM_ID}/audience/test-links`, {
      ...request,
      membershipIds: null,
    });
  });

  it.each([
    [
      "has the route when an empty set is refused",
      ApiResult.validationError("Empty."),
      true,
    ],
    [
      "lacks the route when it answers 404",
      ApiResult.notFoundError("Not found."),
      false,
    ],
    [
      "is not trusted when the probe fails otherwise",
      ApiResult.serverError("Down."),
      false,
    ],
  ])("%s", async (_, answer, supported) => {
    const post = vi.fn().mockResolvedValue(answer);

    const result = await audienceWith({ post }).supportsTestLinks(FORM_ID);

    expect(result).toBe(supported);
    expect(post).toHaveBeenCalledWith(
      `/forms/${FORM_ID}/audience/test-links`,
      expect.objectContaining({ membershipIds: [] }),
    );
  });
});
