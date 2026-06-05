import { ActivateInviteForm } from "@/features/auth/use-cases/activate-invite";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/use-cases/activate-invite/activate-invite.action", () => ({
  activateInviteAction: vi.fn(),
}));

describe("ActivateInviteForm", () => {
  it("renders invited email as username for password managers", () => {
    render(<ActivateInviteForm token="invite-token" email="invitee@example.com" />);

    const emailInput = screen.getByLabelText("Email");
    expect((emailInput as HTMLInputElement).value).toBe("invitee@example.com");
    expect(emailInput.getAttribute("autocomplete")).toBe("username");
    expect(emailInput.hasAttribute("readonly")).toBe(true);

    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe(
      "new-password",
    );
    expect(
      screen.getByLabelText("Confirm Password").getAttribute("autocomplete"),
    ).toBe("new-password");
  });

  it("prevents submit when the password fails client validation", () => {
    render(<ActivateInviteForm token="invite-token" email="invitee@example.com" />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "Password1" },
    });

    const form = screen
      .getByRole("button", { name: "Activate account" })
      .closest("form");

    if (!form) {
      throw new Error("Activate invite form was not rendered.");
    }

    expect(fireEvent.submit(form)).toBe(false);
    expect(
      screen.getByText("Password must contain at least one special character"),
    ).toBeDefined();
  });
});
