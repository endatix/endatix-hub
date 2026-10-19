import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { restartTestSubmissionAction } from "../restart-test-submission.action";

const checkAllPermissions = vi.fn();
const restartTestSubmission = vi.fn();
const cookieJar = { get: vi.fn(), set: vi.fn() };

vi.mock("@/auth", () => ({
  auth: async () => ({ accessToken: "hub-session" }),
}));
vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: async () => ({ checkAllPermissions }),
}));
vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    audience = { restartTestSubmission };
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar }));

const FORM_ID = "1525035735390879744";
const SUBMISSION_ID = "1526934587983265799";

describe("restartTestSubmissionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_FORMS_COOKIE_NAME = "FPSK";
    checkAllPermissions.mockResolvedValue({ success: true });
  });

  it("swaps the form cookie to the new test submission", async () => {
    restartTestSubmission.mockResolvedValue(
      ApiResult.success({ submissionId: "22", token: "new-token" }),
    );
    cookieJar.get.mockReturnValue({
      value: JSON.stringify({ [FORM_ID]: "old-token" }),
    });

    const result = await restartTestSubmissionAction(FORM_ID, SUBMISSION_ID);

    expect(Result.isSuccess(result)).toBe(true);
    expect(checkAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Forms.Test,
    ]);
    expect(restartTestSubmission).toHaveBeenCalledWith(FORM_ID, SUBMISSION_ID);
    expect(JSON.parse(cookieJar.set.mock.calls[0][1])).toEqual({
      [FORM_ID]: "new-token",
    });
  });

  it("refuses without forms.test, without calling the API or redirecting", async () => {
    checkAllPermissions.mockResolvedValue({ success: false });

    const result = await restartTestSubmissionAction(FORM_ID, SUBMISSION_ID);

    expect(Result.isError(result)).toBe(true);
    expect(restartTestSubmission).not.toHaveBeenCalled();
    expect(cookieJar.set).not.toHaveBeenCalled();
  });

  it("keeps a 404 recognisable and the cookie unchanged", async () => {
    restartTestSubmission.mockResolvedValue(
      ApiResult.notFoundError("Person not found.", { statusCode: 404 }),
    );

    const result = await restartTestSubmissionAction(FORM_ID, SUBMISSION_ID);

    expect(Result.isError(result) && result.statusCode).toBe(404);
    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});
