import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
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

    expect(opened).toEqual({ kind: "opened" });
    expect(redeemLink).toHaveBeenCalledWith(FORM_ID, LINK_TOKEN);
    expect(JSON.parse(cookieJar.set.mock.calls[0][1])).toEqual({
      [FORM_ID]: "submission-token",
    });
  });

  it("answers notFound for a link the API does not know, and sets no cookie", async () => {
    redeemLink.mockResolvedValue(ApiResult.notFoundError("Link not found"));

    expect(await openPersonalLinkAction(FORM_ID, LINK_TOKEN)).toEqual({
      kind: "notFound",
    });
    expect(cookieJar.set).not.toHaveBeenCalled();
  });

  it("answers notFound for a malformed form id", async () => {
    redeemLink.mockResolvedValue(ApiResult.validationError("Invalid formId"));

    expect(await openPersonalLinkAction("abc", LINK_TOKEN)).toEqual({
      kind: "notFound",
    });
  });

  it("answers unavailable when the API fails, so the respondent can try again", async () => {
    redeemLink.mockResolvedValue(ApiResult.serverError("Busy"));

    expect(await openPersonalLinkAction(FORM_ID, LINK_TOKEN)).toEqual({
      kind: "unavailable",
    });
    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});
