import { TokenSubmissionError } from "@/features/public-form/ui/token-submission-error";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/public-form/ui/embed-height-reporter", () => ({
  EmbedHeightReporter: () => <div data-testid="embed-height-reporter" />,
}));

describe("TokenSubmissionError", () => {
  it.each([
    ["invalid_token", ERROR_CODE.INVALID_TOKEN],
    ["invalid_access_token", ERROR_CODE.INVALID_ACCESS_TOKEN],
    ["token_expired", ERROR_CODE.TOKEN_EXPIRED],
    ["submission_token_invalid", ERROR_CODE.SUBMISSION_TOKEN_INVALID],
  ] as const)("renders expired copy for %s", (_name, errorCode) => {
    render(<TokenSubmissionError errorCode={errorCode} variant="share" />);

    expect(
      screen.getByRole("heading", {
        name: "This link is invalid or has expired.",
      }),
    ).toBeDefined();
    // Respondent pages carry no HTTP status; the sentence is the whole answer.
    expect(screen.queryByText("401")).toBeNull();
  });

  it("tells a share reader why the link expired and that the tab can close", () => {
    render(
      <TokenSubmissionError
        errorCode={ERROR_CODE.TOKEN_EXPIRED}
        variant="share"
      />,
    );

    expect(
      screen.getByText(
        "Access links work for a limited time and only when copied in full. Ask whoever shared it for a new link to continue.",
      ),
    ).toBeDefined();
    expect(screen.getByText("You can close this tab.")).toBeDefined();
  });

  it("omits the close-tab note inside an embed", () => {
    render(
      <TokenSubmissionError
        errorCode={ERROR_CODE.TOKEN_EXPIRED}
        variant="embed"
      />,
    );

    expect(screen.queryByText("You can close this tab.")).toBeNull();
  });

  it("falls back to not-found copy for an unknown code", () => {
    render(<TokenSubmissionError errorCode="toString" variant="share" />);

    expect(
      screen.getByRole("heading", {
        name: "We couldn't find that submission.",
      }),
    ).toBeDefined();
  });
});
