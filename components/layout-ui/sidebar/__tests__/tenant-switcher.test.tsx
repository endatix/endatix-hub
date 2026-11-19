import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { TenantSwitcher } from "@/components/layout-ui/sidebar/tenant-switcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { Brand } from "@/lib/branding";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { BUILT_IN_LAYER, mergeBrand } from "@/lib/branding/layers";
import { packBrand } from "@/test/pack-brand";

function renderUnder(brand: Brand, ui: ReactNode) {
  return render(
    <BrandProvider brand={brand}>
      <SidebarProvider>{ui}</SidebarProvider>
    </BrandProvider>,
  );
}

describe("TenantSwitcher", () => {
  it("names the deployment Endatix with no brand pack", () => {
    renderUnder(mergeBrand([BUILT_IN_LAYER]), <TenantSwitcher tenants={[]} />);

    expect(screen.getByText("Endatix")).toBeDefined();
  });

  it("names the deployment after the brand pack", () => {
    renderUnder(packBrand(), <TenantSwitcher tenants={[]} />);

    expect(screen.getByText("Example Forms")).toBeDefined();
    expect(screen.queryByText("Endatix")).toBeNull();
  });
});
