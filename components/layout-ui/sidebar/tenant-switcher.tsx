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
import EndatixLogoSvg from "@/public/assets/icons/endatix-logo-beta.svg";
import Image from "next/image";

const ENDATIX_CORP_SITE_URL = "https://endatix.com";

function EndatixLogoIcon({ className }: { className?: string }) {
  return (
    <Image
      src={EndatixLogoSvg}
      alt=""
      className={className}
      width={16}
      height={16}
      aria-hidden
    />
  );
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
  logo: EndatixLogoIcon,
  href: "/forms",
};

export function TenantSwitcher({ tenants }: TenantSwitcherProps) {
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
              <div className="flex aspect-square size-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:rounded-md">
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
                <div className="flex size-6 items-center justify-center rounded-sm border">
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

const SingleTenantDisplay = ({ tenant }: { tenant: Tenant }) => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <a href={ENDATIX_CORP_SITE_URL} target="_blank">
            <div className="fflex aspect-square size-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-full group-data-[collapsible=icon]:rounded-md">
              <tenant.logo className="size-8 shrink-0" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-medium">{tenant.name}</span>
              {tenant.description && (
                <span className="truncate text-xs">{tenant.description}</span>
              )}
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
