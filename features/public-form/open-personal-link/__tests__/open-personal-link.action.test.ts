import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { ErrorType, Result } from "@/lib/result";
import { openPersonalLinkAction } from "../open-personal-link.action";

const redeemLink = vi.fn();
const cookieJar = { get: vi.fn(), set: vi.fn() };

vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    audience = { redeemLink };
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar }));

const FORM_ID = "1525035735390879744";
const LINK_TOKEN = "link-token";

describe("openPersonalLinkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_FORMS_COOKIE_NAME = "FPSK";
    cookieJar.get.mockReturnValue(undefined);
  });

  it("redeems the link and keeps the submission token in the form cookie", async () => {
    redeemLink.mockResolvedValue(
      ApiResult.success({
        submissionId: "22",
        created: true,
        accessToken: "submission-token",
      }),
    );

    const opened = await openPersonalLinkAction(FORM_ID, LINK_TOKEN);

    expect(Result.isSuccess(opened)).toBe(true);
    expect(redeemLink).toHaveBeenCalledWith(FORM_ID, LINK_TOKEN);
    expect(JSON.parse(cookieJar.set.mock.calls[0][1])).toEqual({
      [FORM_ID]: "submission-token",
    });
  });

  it("answers that the link is not valid when the API does not know it, and sets no cookie", async () => {
    redeemLink.mockResolvedValue(ApiResult.notFoundError("Link not found"));

    const opened = await openPersonalLinkAction(FORM_ID, LINK_TOKEN);

    expect(Result.isError(opened) && opened.errorType).toBe(
      ErrorType.ValidationError,
    );
    expect(cookieJar.set).not.toHaveBeenCalled();
  });

  it("answers that the link is not valid for a malformed form id", async () => {
    redeemLink.mockResolvedValue(ApiResult.validationError("Invalid formId"));

    const opened = await openPersonalLinkAction("abc", LINK_TOKEN);

    expect(Result.isError(opened) && opened.errorType).toBe(
      ErrorType.ValidationError,
    );
  });

  it("answers a retryable error when the API fails", async () => {
    redeemLink.mockResolvedValue(ApiResult.serverError("Busy"));

    const opened = await openPersonalLinkAction(FORM_ID, LINK_TOKEN);

    expect(Result.isError(opened) && opened.errorType).toBe(ErrorType.Error);
    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});
