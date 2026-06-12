import { describe, expect, it } from "vitest";
import { buildFormAccessTokenBody } from "../form-access-token.shared";

describe("buildFormAccessTokenBody", () => {
  it("forwards share access token context for runtime data-list access", () => {
    const body = buildFormAccessTokenBody({
      formId: "form-1",
      submissionId: "submission-1",
      token: "submission-1.1781332119.s.signature",
      tokenType: "AccessToken",
    });

    expect(body).toEqual({
      token: "submission-1.1781332119.s.signature",
      tokenType: "AccessToken",
    });
  });
});
