import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { requireAudienceAccess } from "../../shared/require-audience-api.server";
import { createTestLinkAction } from "../create-test-link.action";

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn() },
}));
vi.mock("../../shared/require-audience-api.server", () => ({
  requireAudienceAccess: vi.fn(),
}));

const FORM_ID = "1525035735390879744";
const MEMBER_ID = "1526934587983265790";
const MEMBERSHIP_ID = "1526934587983265792";
const SUBMISSION_ID = "1527000000000000001";
const SEVEN_DAYS = 60 * 24 * 7;
const PERSON = { audienceMemberId: MEMBER_ID, membershipId: MEMBERSHIP_ID };

const mintTestLinks = vi.fn();
const getParticipant = vi.fn();
const openTestSubmission = vi.fn();
const createAccessToken = vi.fn();
const deleteSubmission = vi.fn();
const checkPermission = vi.fn();

const api = {
  audience: { mintTestLinks, getParticipant, openTestSubmission },
  submissions: { createAccessToken, delete: deleteSubmission },
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

function minted(token: string) {
  return ApiResult.success([
    {
      membershipId: MEMBERSHIP_ID,
      identifier: "tester@acme.test",
      run: 1,
      submissionId: SUBMISSION_ID,
      token,
      expiresAt: "2026-11-02T10:00:00Z",
    },
  ]);
}

describe("createTestLinkAction on an API with the test links route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceAccess).mockResolvedValue(
      Result.success({ api, checkPermission } as never),
    );
    grant(Permissions.Forms.Test, Permissions.Forms.Edit);
    mintTestLinks.mockResolvedValue(minted("signed.token"));
  });

  it("asks the route for one run for this participant and returns its link", async () => {
    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(result).toEqual(
      Result.success({
        url: `/share/${FORM_ID}?token=signed.token`,
        expiresAt: "2026-11-02T10:00:00Z",
      }),
    );
    expect(mintTestLinks).toHaveBeenCalledWith(FORM_ID, {
      membershipIds: [MEMBERSHIP_ID],
      runsEach: 1,
      expiryMinutes: SEVEN_DAYS,
    });
  });

  it("works for an editor who has no submissions grant, and deletes nothing", async () => {
    await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(getParticipant).not.toHaveBeenCalled();
    expect(openTestSubmission).not.toHaveBeenCalled();
    expect(createAccessToken).not.toHaveBeenCalled();
    expect(deleteSubmission).not.toHaveBeenCalled();
  });

  it("keeps the expiry within 1 hour to 60 days", async () => {
    await createTestLinkAction(FORM_ID, PERSON, 1);

    expect(mintTestLinks).toHaveBeenCalledWith(
      FORM_ID,
      expect.objectContaining({ expiryMinutes: 60 }),
    );
  });

  it("returns the route's refusal of a real participant without trying again", async () => {
    mintTestLinks.mockResolvedValue(
      ApiResult.validationError("Test links are only for Test participants."),
    );

    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toBe(
      "Test links are only for Test participants.",
    );
    expect(openTestSubmission).not.toHaveBeenCalled();
  });

  it.each([
    ["test forms", [Permissions.Forms.Edit]],
    ["edit forms", [Permissions.Forms.Test]],
  ])(
    "refuses a reader who cannot %s, before asking for a link",
    async (_, granted) => {
      grant(...granted);

      const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

      expect(Result.isError(result)).toBe(true);
      expect(mintTestLinks).not.toHaveBeenCalled();
    },
  );
});

describe("createTestLinkAction on an older API (the route answers 404)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mintTestLinks.mockResolvedValue(ApiResult.notFoundError("Not found."));
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
    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

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
      await createTestLinkAction(FORM_ID, PERSON, asked);

      expect(createAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ expiryMinutes: sent }),
      );
    },
  );

  it("refuses a real person and opens no test submission", async () => {
    getParticipant.mockResolvedValue(participant(false));

    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

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

      const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

      expect(Result.isError(result)).toBe(true);
      expect(getParticipant).not.toHaveBeenCalled();
      expect(openTestSubmission).not.toHaveBeenCalled();
    },
  );

  it("returns the open failure and mints no token", async () => {
    openTestSubmission.mockResolvedValue(
      ApiResult.notFoundError("The person is not on this form."),
    );

    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toBe(
      "The person is not on this form.",
    );
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it("deletes the test submission it opened when the token fails, and returns the token error", async () => {
    createAccessToken.mockResolvedValue(
      ApiResult.serverError("Could not create the token."),
    );
    deleteSubmission.mockResolvedValue(ApiResult.success("deleted"));

    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toBe(
      "Could not create the token.",
    );
    expect(deleteSubmission).toHaveBeenCalledWith(FORM_ID, SUBMISSION_ID);
    expect(rollbackLogs()).toHaveLength(0);
  });

  it("logs a failed cleanup by ids and error code only, and still returns the token error", async () => {
    createAccessToken.mockResolvedValue(
      ApiResult.serverError("Could not create the token."),
    );
    deleteSubmission.mockResolvedValue(
      ApiResult.serverError("Delete failed.", undefined, "delete_failed"),
    );

    const result = await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(Result.isError(result) && result.message).toBe(
      "Could not create the token.",
    );
    expect(rollbackLogs()).toEqual([
      [
        expect.stringMatching(/test submission/),
        undefined,
        {
          formId: FORM_ID,
          submissionId: SUBMISSION_ID,
          errorCode: "delete_failed",
        },
        "audience.test-links.create",
      ],
    ]);
  });

  it("deletes nothing when the token is minted", async () => {
    await createTestLinkAction(FORM_ID, PERSON, SEVEN_DAYS);

    expect(deleteSubmission).not.toHaveBeenCalled();
  });
});

/** The rollback's own log: the API-error logs from `toResult` carry no submission id. */
const rollbackLogs = () =>
  vi
    .mocked(TelemetryLogger.error)
    .mock.calls.filter(
      ([, , attributes]) =>
        (attributes as Record<string, unknown> | undefined)?.submissionId,
    );
