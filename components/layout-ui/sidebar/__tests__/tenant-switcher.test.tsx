import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantSwitcher } from "../tenant-switcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { MembershipTenant } from "@/lib/endatix-api";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ""} />,
}));

vi.mock("@/features/tenants/switch-tenant/switch-tenant.action", () => ({
  switchTenantAction: vi.fn(),
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const ACME: MembershipTenant = {
  id: "1",
  name: "Acme",
  slug: "xK9mP2qR8vNw",
  isActive: true,
};

const BETA: MembershipTenant = {
  id: "2",
  name: "Beta",
  slug: "aB3cD4eF5gH6",
  isActive: false,
};

function renderSwitcher(tenants?: MembershipTenant[]) {
  return render(
    <SidebarProvider>
      <TenantSwitcher tenants={tenants} />
    </SidebarProvider>,
  );
}

describe("TenantSwitcher", () => {
  it("shows the Endatix wordmark when there is a single tenant", () => {
    renderSwitcher([ACME]);

    expect(screen.getAllByAltText("Endatix Hub").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tenants")).toBeNull();
    expect(screen.queryByText("Add tenant")).toBeNull();
  });

  it("shows a dropdown trigger when the user belongs to two or more tenants", () => {
    renderSwitcher([ACME, BETA]);

    expect(screen.getByRole("button").getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.queryByText("Add tenant")).toBeNull();
    expect(screen.queryByAltText("Endatix Hub")).toBeNull();
  });
});
