"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/lib/branding/client";

function DeploymentIcon({ className }: Readonly<{ className?: string }>) {
  return <BrandLogo variant="icon" className={className} />;
}

interface Tenant {
  name: string;
  description?: string;
  logo: React.ElementType;
  href?: string;
}

interface TenantSwitcherProps {
  tenants?: Tenant[];
}

const DEFAULT_TENANT = {
  name: "Endatix",
  description: "beta",
  logo: DeploymentIcon,
  href: "/forms",
};

export function TenantSwitcher({ tenants }: Readonly<TenantSwitcherProps>) {
  const { isMobile } = useSidebar();
  const [activeTenant, setActiveTenant] = React.useState(
    tenants?.at(0) ?? DEFAULT_TENANT,
  );

  if (!activeTenant) {
    return null;
  }

  if (tenants === undefined && activeTenant) {
    return <SingleTenantDisplay tenant={activeTenant} />;
  }

  const tenantsToDisplay = tenants ?? [DEFAULT_TENANT];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 flex-shrink-0 items-center justify-center group-data-[collapsible=icon]:size-full">
                <activeTenant.logo className="size-8 shrink-0" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeTenant.name}
                </span>
                <span className="truncate text-xs">
                  {activeTenant.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tenants
            </DropdownMenuLabel>
            {tenantsToDisplay?.map((tenant, index) => (
              <DropdownMenuItem
                key={tenant.name}
                onClick={() => setActiveTenant(tenant)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center">
                  <tenant.logo className="size-6 shrink-0" />
                </div>
                {tenant.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add tenant
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

const SingleTenantDisplay = ({ tenant }: Readonly<{ tenant: Tenant }>) => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:rounded-[3px] group-data-[collapsible=icon]:overflow-hidden">
          <a href={tenant.href ?? "/"}>
            {/* Collapsed: square icon */}
            <div className="hidden aspect-square size-full items-center justify-center group-data-[collapsible=icon]:flex">
              <tenant.logo className="size-8 shrink-0" />
            </div>
            {/* Expanded: the brand lockup (built-in: icon and wordmark files, for gap control) */}
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <BrandLogo variant="lockup" priority />
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
