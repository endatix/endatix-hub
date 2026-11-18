import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithBrand } from "@/test/render-with-brand";
import { TenantRegistrationClosed } from "../tenant-registration-closed";

describe("TenantRegistrationClosed", () => {
  it("hides registration and links back to tenant sign-in", () => {
    renderWithBrand(
      <TenantRegistrationClosed tenantName="Acme" shortUrl="xk9mp2qr" />,
    );

    expect(screen.getByText("Registration is closed")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /create account/i }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /sign in/i }).getAttribute("href"),
    ).toBe("/t/xk9mp2qr/signin");
  });
});
