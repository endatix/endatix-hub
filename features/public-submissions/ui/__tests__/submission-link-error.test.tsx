import { SubmissionLinkError } from "@/features/public-submissions/ui/submission-link-error";
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

  it("never shows an HTTP status", () => {
    const { container } = render(
      <SubmissionLinkError action="view" kind="notFound" />,
    );

    expect(container.textContent).not.toMatch(/\b40[134]\b/);
  });
});
