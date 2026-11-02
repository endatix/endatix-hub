import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { requireAudienceApi } from "../../shared/require-audience-api.server";
import { reissueAudienceLinkAction } from "../reissue-audience-link.action";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../shared/require-audience-api.server", () => ({
  requireAudienceApi: vi.fn(),
  checkAudienceApi: vi.fn(),
}));

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";

const reissueLink = vi.fn();
const api = { audience: { reissueLink } };

const PROBLEM = "application/problem+json";
const OVERTAKEN =
  "The link was reissued by another request meanwhile. Reissue it again for a token you can send.";

function notFound(message: string, problemMediaType?: string) {
  return ApiResult.notFoundError(message, {
    statusCode: 404,
    problemMediaType,
  });
}

describe("reissueAudienceLinkAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceApi).mockResolvedValue(
      Result.success(api as never),
    );
  });

  it("returns the participant's new token, behind forms.edit", async () => {
    reissueLink.mockResolvedValue(
      ApiResult.success({ membershipId: MEMBERSHIP_ID, token: "new-token" }),
    );

    const result = await reissueAudienceLinkAction(FORM_ID, MEMBERSHIP_ID);

    expect(requireAudienceApi).toHaveBeenCalledWith(Permissions.Forms.Edit);
    expect(reissueLink).toHaveBeenCalledWith(FORM_ID, MEMBERSHIP_ID);
    expect(result).toEqual(
      Result.success({ membershipId: MEMBERSHIP_ID, token: "new-token" }),
    );
  });

  it("says a newer API is needed when the route itself is not found", async () => {
    reissueLink.mockResolvedValue(notFound("Resource not found"));

    const result = await reissueAudienceLinkAction(FORM_ID, MEMBERSHIP_ID);

    expect(Result.isError(result) && result.message).toBe(
      "Reissuing links needs a newer Endatix API.",
    );
  });

  it("passes the API's own not-found reason through", async () => {
    reissueLink.mockResolvedValue(
      notFound("No link to reissue; generate links first.", PROBLEM),
    );

    const result = await reissueAudienceLinkAction(FORM_ID, MEMBERSHIP_ID);

    expect(Result.isError(result) && result.message).toBe(
      "No link to reissue; generate links first.",
    );
  });

  it("passes the API's refusal for a test participant through", async () => {
    reissueLink.mockResolvedValue(
      ApiResult.validationError(
        "A test participant is never sent a link.",
        undefined,
        { statusCode: 400, problemMediaType: PROBLEM },
      ),
    );

    const result = await reissueAudienceLinkAction(FORM_ID, MEMBERSHIP_ID);

    expect(Result.isError(result) && result.message).toBe(
      "A test participant is never sent a link.",
    );
  });

  it("passes the API's conflict through when another reissue finished first", async () => {
    reissueLink.mockResolvedValue(
      ApiResult.conflictError(OVERTAKEN, {
        statusCode: 409,
        problemMediaType: PROBLEM,
      }),
    );

    const result = await reissueAudienceLinkAction(FORM_ID, MEMBERSHIP_ID);

    expect(Result.isError(result) && result.message).toBe(OVERTAKEN);
  });
});
