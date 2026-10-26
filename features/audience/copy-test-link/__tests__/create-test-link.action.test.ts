import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { requireAudienceAccess } from "../../shared/require-audience-api.server";
import { createTestLinkAction } from "../create-test-link.action";

vi.mock("../../shared/require-audience-api.server", () => ({
  requireAudienceAccess: vi.fn(),
}));

const FORM_ID = "1525035735390879744";
const MEMBER_ID = "1526934587983265790";
const MEMBERSHIP_ID = "1526934587983265792";
const SUBMISSION_ID = "1527000000000000001";
const SEVEN_DAYS = 60 * 24 * 7;

const getParticipant = vi.fn();
const openTestSubmission = vi.fn();
const createAccessToken = vi.fn();
const checkPermission = vi.fn();

const api = {
  audience: { getParticipant, openTestSubmission },
  submissions: { createAccessToken },
};

function participant(isTest: boolean) {
  return ApiResult.success({
    membershipId: MEMBERSHIP_ID,
    audienceMemberId: MEMBER_ID,
    identifier: "tester@example.com",
    isTest,
  });
}

function grant(...granted: string[]) {
  checkPermission.mockImplementation(async (permission: string) => ({
    success: granted.includes(permission),
  }));
}

describe("createTestLinkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceAccess).mockResolvedValue(
      Result.success({ api, checkPermission } as never),
    );
    grant(
      Permissions.Forms.Test,
      Permissions.Forms.Edit,
      Permissions.Submissions.View,
    );
    getParticipant.mockResolvedValue(participant(true));
    openTestSubmission.mockResolvedValue(
      ApiResult.success({ submissionId: SUBMISSION_ID, token: "cookie" }),
    );
    createAccessToken.mockResolvedValue(
      ApiResult.success({
        token: "signed.token",
        expiresAt: "2026-11-02T10:00:00Z",
        permissions: ["submit"],
      }),
    );
  });

  it("opens a test submission for a test person and returns a submit link to it", async () => {
    const result = await createTestLinkAction(FORM_ID, MEMBER_ID, SEVEN_DAYS);

    expect(result).toEqual(
      Result.success({
        url: `/share/${FORM_ID}?token=signed.token`,
        expiresAt: "2026-11-02T10:00:00Z",
      }),
    );
    expect(requireAudienceAccess).toHaveBeenCalledWith(Permissions.Forms.Test);
    expect(openTestSubmission).toHaveBeenCalledWith(FORM_ID, MEMBERSHIP_ID);
    expect(createAccessToken).toHaveBeenCalledWith({
      formId: FORM_ID,
      submissionId: SUBMISSION_ID,
      expiryMinutes: SEVEN_DAYS,
      permissions: ["submit"],
    });
  });

  it.each([
    [1, 60],
    [Number.NaN, SEVEN_DAYS],
    [60 * 24 * 90, 60 * 24 * 60],
  ])(
    "keeps an expiry of %s minutes within 1 hour to 60 days (%s)",
    async (asked, sent) => {
      await createTestLinkAction(FORM_ID, MEMBER_ID, asked);

      expect(createAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ expiryMinutes: sent }),
      );
    },
  );

  it("refuses a real person and opens no test submission", async () => {
    getParticipant.mockResolvedValue(participant(false));

    const result = await createTestLinkAction(FORM_ID, MEMBER_ID, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toMatch(
      /only for test participants/,
    );
    expect(openTestSubmission).not.toHaveBeenCalled();
  });

  it.each([
    ["share submissions", [Permissions.Forms.Test, Permissions.Forms.Edit]],
    [
      "read participants",
      [Permissions.Forms.Test, Permissions.Submissions.View],
    ],
  ])(
    "refuses a reader who cannot %s, before reading the person",
    async (_, granted) => {
      grant(...granted);

      const result = await createTestLinkAction(FORM_ID, MEMBER_ID, SEVEN_DAYS);

      expect(Result.isError(result)).toBe(true);
      expect(getParticipant).not.toHaveBeenCalled();
      expect(openTestSubmission).not.toHaveBeenCalled();
    },
  );

  it("returns the open failure and mints no token", async () => {
    openTestSubmission.mockResolvedValue(
      ApiResult.notFoundError("The person is not on this form."),
    );

    const result = await createTestLinkAction(FORM_ID, MEMBER_ID, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toBe(
      "The person is not on this form.",
    );
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("returns the token failure after the test submission was opened", async () => {
    createAccessToken.mockResolvedValue(
      ApiResult.serverError("Could not create the token."),
    );

    const result = await createTestLinkAction(FORM_ID, MEMBER_ID, SEVEN_DAYS);

    expect(Result.isError(result)).toBe(true);
    expect(openTestSubmission).toHaveBeenCalledTimes(1);
  });
});
