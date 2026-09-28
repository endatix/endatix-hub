import {
  getSubmissionLinkFailureKind,
  SubmissionLinkError,
} from "@/features/public-submissions/ui/submission-link-error";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("SubmissionLinkError", () => {
  it.each(["view", "edit"] as const)(
    "names the %s permission the link is missing",
    (action) => {
      render(<SubmissionLinkError action={action} kind="forbidden" />);

      expect(
        screen.getByRole("heading", {
          name: `You can't ${action} this submission.`,
        }),
      ).toBeDefined();
      expect(
        screen.getByText(
          `The access link does not include ${action} permission.`,
        ),
      ).toBeDefined();
    },
  );

  it.each(["view", "edit"] as const)(
    "explains a rejected %s link like the PDF export page",
    (action) => {
      render(<SubmissionLinkError action={action} kind="expired" />);

      expect(
        screen.getByRole("heading", {
          name: "This link is invalid or has expired.",
        }),
      ).toBeDefined();
      expect(
        screen.getByText(
          `Access links work for a limited time and only when copied in full. Ask whoever shared it for a new link to ${action} this submission.`,
        ),
      ).toBeDefined();
      expect(screen.getByText("You can close this tab.")).toBeDefined();
    },
  );

  it("never shows an HTTP status", () => {
    const { container } = render(
      <SubmissionLinkError action="view" kind="notFound" />,
    );

    expect(container.textContent).not.toMatch(/\b40[134]\b/);
  });
});

describe("getSubmissionLinkFailureKind", () => {
  it.each([
    ["expired token", { message: "Token expired", errorCode: "token_expired" }],
    [
      "tampered token",
      { message: "Invalid access token", errorCode: "invalid_access_token" },
    ],
    ["tampered token without a code", { message: "Invalid access token" }],
  ])("gives a %s the same page", (_name, failure) => {
    expect(getSubmissionLinkFailureKind(failure)).toBe("expired");
  });

  it("keeps a permission failure on the forbidden page", () => {
    expect(
      getSubmissionLinkFailureKind({
        message: "Invalid permission: edit.",
        errorCode: "invalid_permission",
      }),
    ).toBe("forbidden");
  });

  it("falls back to not found", () => {
    expect(
      getSubmissionLinkFailureKind({ message: "Submission not found" }),
    ).toBe("notFound");
  });
});
