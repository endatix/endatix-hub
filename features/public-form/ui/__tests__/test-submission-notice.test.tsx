import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestSubmissionNotice } from "../test-submission-notice";

describe("TestSubmissionNotice", () => {
  it("says this is a test submission and shows no data", () => {
    render(<TestSubmissionNotice />);

    const notice = screen.getByTestId("respondent-test-mode-badge");
    expect(notice.textContent).toBe("You are submitting a test submission");
    expect(notice.getAttribute("aria-label")).toBe("Test submission");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
