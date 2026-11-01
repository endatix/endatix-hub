import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../../shared/with-hub-audience-api.server";
import { openTestSubmissionAction } from "../open-test-submission.action";

vi.mock("../../shared/with-hub-audience-api.server", () => ({
  withHubAudienceApi: vi.fn(),
}));

const cookieJar = { get: vi.fn(), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieJar }));

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";

describe("openTestSubmissionAction", () => {
  beforeEach(() => {
    vi.mocked(withHubAudienceApi).mockReset();
    cookieJar.get.mockReset();
    cookieJar.set.mockReset();
    process.env.NEXT_FORMS_COOKIE_NAME = "FPSK";
  });

  it("asks for forms.test and keeps the token in the form cookie", async () => {
    vi.mocked(withHubAudienceApi).mockResolvedValue(
      Result.success({ submissionId: "21", token: "test-token" }),
    );
    cookieJar.get.mockReturnValue({ value: JSON.stringify({ "9": "other" }) });

    const result = await openTestSubmissionAction(FORM_ID, MEMBERSHIP_ID);

    expect(result).toEqual(Result.success({ url: `/share/${FORM_ID}` }));
    expect(vi.mocked(withHubAudienceApi).mock.calls[0][1]).toMatchObject({
      permission: Permissions.Forms.Test,
    });
    const [name, value, options] = cookieJar.set.mock.calls[0];
    expect(name).toBe("FPSK");
    expect(JSON.parse(value)).toEqual({
      "9": "other",
      [FORM_ID]: "test-token",
    });
    expect(options).toMatchObject({ httpOnly: true, sameSite: "strict" });
  });

  it("returns the API failure and leaves the cookie alone", async () => {
    vi.mocked(withHubAudienceApi).mockResolvedValue(
      Result.error("The person is not on this form."),
    );

    const result = await openTestSubmissionAction(FORM_ID, MEMBERSHIP_ID);

    expect(Result.isError(result) && result.message).toBe(
      "The person is not on this form.",
    );
    expect(cookieJar.set).not.toHaveBeenCalled();
  });
});
