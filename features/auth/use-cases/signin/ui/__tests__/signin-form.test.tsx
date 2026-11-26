import { fireEvent, screen } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { expect, it, vi } from "vitest";
import { renderWithBrand } from "@/test/render-with-brand";
import SigninForm from "../signin-form";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("../../sign-in-with-endatix.action", () => ({ signInWithEndatixAction: vi.fn() }));

it.each([
  [undefined, "/workspace/start"],
  ["/forms", "/forms"],
  ["/settings/security", "/settings/security"],
])("passes the same destination to the password and enabled external provider (%s)", (returnUrl, expected) => {
  const { container } = renderWithBrand(<SigninForm
    endatixAuthProvider={{ id: "endatix", name: "Password", type: "credentials" }}
    externalAuthProviders={[{ id: "organization", name: "Organization", type: "oidc", signInLabel: "Organization sign-in" }]}
    returnUrl={returnUrl}
  />);
  const form = container.querySelector("form")!;
  expect(new FormData(form).get("returnUrl")).toBe(expected);
  fireEvent.click(screen.getByRole("button", { name: "Organization sign-in" }));
  expect(signIn).toHaveBeenCalledWith("organization", { redirectTo: expected });
});
