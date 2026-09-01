import { TokenSubmissionError } from "@/features/public-form/ui/token-submission-error";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("TokenSubmissionError", () => {
  it.each([
    ["invalid_token", ERROR_CODE.INVALID_TOKEN],
    ["invalid_access_token", ERROR_CODE.INVALID_ACCESS_TOKEN],
    ["token_expired", ERROR_CODE.TOKEN_EXPIRED],
    ["submission_token_invalid", ERROR_CODE.SUBMISSION_TOKEN_INVALID],
  ] as const)("renders expired copy for %s", (_name, errorCode) => {
    render(<TokenSubmissionError errorCode={errorCode} />);

    expect(screen.getByText("Link expired")).toBeDefined();
    expect(screen.getByText("This link has expired.")).toBeDefined();
    // Expired access is a 401, not the 404 this used to borrow from NotFoundComponent.
    expect(screen.getByText("401")).toBeDefined();
  });
});
