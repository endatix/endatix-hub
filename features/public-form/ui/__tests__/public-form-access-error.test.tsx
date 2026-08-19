import {
  buildPublicFormSignInHref,
  PublicFormAccessError,
} from "@/features/public-form/ui/public-form-access-error";
import { RETURN_URL_PARAM, SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/public-form/ui/embed-height-reporter", () => ({
  EmbedHeightReporter: () => <div data-testid="embed-height-reporter" />,
}));

describe("buildPublicFormSignInHref", () => {
  it("returns a sign-in URL with the share form as returnUrl", () => {
    expect(
      buildPublicFormSignInHref({ formId: "form-1", variant: "share" }),
    ).toBe(
      `${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodeURIComponent("/share/form-1")}`,
    );
  });

  it("includes the continuation token in the returnUrl", () => {
    expect(
      buildPublicFormSignInHref({
        formId: "form-1",
        variant: "embed",
        urlToken: "token.rw",
      }),
    ).toBe(
      `${SIGNIN_PATH}?${RETURN_URL_PARAM}=${encodeURIComponent(
        "/embed/form-1?token=token.rw",
      )}`,
    );
  });
});

describe("PublicFormAccessError", () => {
  it("renders a sign-in link for unauthorized access", () => {
    render(
      <PublicFormAccessError
        formId="form-1"
        kind="unauthorized"
        variant="share"
      />,
    );

    expect(screen.getByText("401")).toBeDefined();
    expect(screen.getByText("Sign in required")).toBeDefined();
    expect(
      screen.getByText("You must be signed in to access this form."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      buildPublicFormSignInHref({ formId: "form-1", variant: "share" }),
    );
    expect(screen.queryByTestId("embed-height-reporter")).toBeNull();
  });

  it("does not render a sign-in link for forbidden access", () => {
    render(
      <PublicFormAccessError
        formId="form-1"
        kind="forbidden"
        variant="share"
      />,
    );

    expect(screen.getByText("403")).toBeDefined();
    expect(screen.getByText("Access denied")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("reports height when shown in an embed", () => {
    render(
      <PublicFormAccessError
        formId="form-1"
        kind="unauthorized"
        variant="embed"
      />,
    );

    expect(screen.getByTestId("embed-height-reporter")).toBeDefined();
  });
});
