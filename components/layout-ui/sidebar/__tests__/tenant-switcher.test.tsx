import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantSwitcher } from "../tenant-switcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { SwitcherTenant } from "@/features/tenants/switch-tenant/types";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ""} />,
}));

vi.mock("@/features/tenants/switch-tenant/switch-tenant.action", () => ({
  selectSwitcherTenantAction: vi.fn(),
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

const ACME: SwitcherTenant = {
  id: "1",
  name: "Acme",
  slug: "xK9mP2qR8vNw",
  isActive: true,
  isMembership: true,
};

const BETA: SwitcherTenant = {
  id: "2",
  name: "Beta",
  slug: "aB3cD4eF5gH6",
  isActive: false,
  isMembership: true,
};

const GAMMA: SwitcherTenant = {
  id: "3",
  name: "Gamma",
  slug: "gH7iJ8kL9mN0",
  isActive: false,
  isMembership: false,
};

function renderSwitcher(tenants?: SwitcherTenant[]) {
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
    expect(screen.queryByText("Your tenants")).toBeNull();
    expect(screen.queryByText("Add tenant")).toBeNull();
  });

  it("shows a dropdown trigger when the user belongs to two or more tenants", () => {
    renderSwitcher([ACME, BETA]);

    expect(screen.getByRole("button").getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.queryByText("Add tenant")).toBeNull();
    expect(screen.queryByAltText("Endatix Hub")).toBeNull();
  });

  it("shows a dropdown when a platform admin has directory tenants to assume", () => {
    renderSwitcher([ACME, GAMMA]);

    expect(screen.getByRole("button").getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.queryByAltText("Endatix Hub")).toBeNull();
  });
});
