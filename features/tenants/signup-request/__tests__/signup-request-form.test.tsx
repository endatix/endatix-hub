import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignupRequestForm } from "../ui/signup-request-form";

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
  it("leaves PostHog id fields empty when the client is absent", () => {
    // Act
    render(<SignupRequestForm />);

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
    expect(screen.getByRole("button", { name: "Request workspace" })).toBeTruthy();
  });
});
