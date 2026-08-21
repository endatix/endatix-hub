import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantRegistrationClosed } from "../tenant-registration-closed";

describe("TenantRegistrationClosed", () => {
  it("hides registration and links back to tenant sign-in", () => {
    render(
      <TenantRegistrationClosed tenantName="Acme" tenantSlug="xK9mP2qR8vNw" />,
    );

    expect(screen.getByText("Registration is closed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /create account/i })).toBeNull();
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe(
      "/t/xK9mP2qR8vNw/signin",
    );
  });
});
