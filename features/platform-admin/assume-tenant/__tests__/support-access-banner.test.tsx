import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupportAccessBanner } from "../ui/support-access-banner";

vi.mock("@/features/platform-admin/assume-tenant/assume-tenant.action", () => ({
  exitAssumeAction: vi.fn(),
}));

describe("SupportAccessBanner", () => {
  it("shows the tenant name when provided", () => {
    render(<SupportAccessBanner tenantName="Acme" />);

    expect(screen.getByText("Support access — Acme")).toBeTruthy();
    expect(screen.getByRole("button", { name: /exit tenant/i })).toBeTruthy();
  });

  it("falls back to a generic title without a tenant name", () => {
    render(<SupportAccessBanner />);

    expect(screen.getByText("Support access")).toBeTruthy();
  });
});
