import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestSubmissionBadge } from "../test-submission-badge";

describe("TestSubmissionBadge", () => {
  it("renders the test-response label", () => {
    render(<TestSubmissionBadge />);

    const badge = screen.getByTestId("respondent-test-mode-badge");
    expect(badge.textContent).toContain("You are submitting test response");
    expect(badge.getAttribute("aria-label")).toBe("Test response mode");
  });
});
