import { fireEvent, screen } from "@testing-library/react";
import { renderWithBrand } from "@/test/render-with-brand";
import { describe, expect, it, vi } from "vitest";
import { SignupRequestForm } from "../ui/signup-request-form";
import { submitSignupRequestAction } from "../submit-signup-request.action";

const posthog = vi.hoisted(() => ({
  get_distinct_id: vi.fn(() => "anon-1"),
  get_session_id: vi.fn(() => "sess-1"),
  setPersonProperties: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("posthog-js/react", () => ({
  usePostHog: () => null,
}));

vi.mock("../submit-signup-request.action", () => ({
  submitSignupRequestAction: vi.fn(),
}));

describe("SignupRequestForm", () => {
  it("announces the stale Terms error after submission", async () => {
    // Arrange
    const message = "The Terms changed. Review the current version before submitting.";
    vi.mocked(submitSignupRequestAction).mockResolvedValueOnce({ isSuccess: false, message });
    renderWithBrand(<SignupRequestForm intro="Request a workspace." />);

    // Act
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "visitor@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Request workspace" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(submitSignupRequestAction).toHaveBeenCalledTimes(1);
  });

  it("leaves PostHog id fields empty when the client is absent", () => {
    // Act
    renderWithBrand(
      <SignupRequestForm intro="Request access to an Endatix workspace." />,
    );

    // Assert
    const distinctId = document.querySelector<HTMLInputElement>(
      "input[name='postHogDistinctId']",
    );
    const sessionId = document.querySelector<HTMLInputElement>(
      "input[name='postHogSessionId']",
    );
    expect(distinctId?.value).toBe("");
    expect(sessionId?.value).toBe("");
    expect(posthog.get_distinct_id).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Request workspace" }),
    ).toBeTruthy();
  });
});
