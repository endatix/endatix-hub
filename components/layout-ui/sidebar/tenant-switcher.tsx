"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getPublicAssetPath } from "@/lib/hosting";
import { selectSwitcherTenantAction } from "@/features/tenants/switch-tenant/switch-tenant.action";
import type { SwitcherTenant } from "@/features/tenants/switch-tenant/types";

function EndatixLogoIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <>
      <Image
        src={getPublicAssetPath("/assets/icons/endatix-paperclip-icon-blue.svg")}
        alt=""
        className={cn(className, "dark:hidden")}
        width={706}
        height={706}
        aria-hidden
      />
      <Image
        src={getPublicAssetPath("/assets/icons/endatix-paperclip-icon-white.svg")}
        alt=""
        className={cn(className, "hidden dark:block")}
        width={706}
        height={706}
        aria-hidden
      />
    </>
  );
}

interface TenantSwitcherProps {
  tenants?: SwitcherTenant[];
}

const DEFAULT_TENANT = {
  name: "Endatix",
  description: "beta",
  logo: EndatixLogoIcon,
  href: "/forms",
};

export function TenantSwitcher({ tenants }: Readonly<TenantSwitcherProps>) {
  const { isMobile } = useSidebar();
  const [, startSwitching] = React.useTransition();
  const activeTenant =
    tenants?.find((tenant) => tenant.isActive) ?? tenants?.at(0);

  if (tenants === undefined || tenants.length <= 1) {
    return <SingleTenantDisplay tenant={DEFAULT_TENANT} />;
  }

  if (!activeTenant) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <TenantGlyph name={activeTenant.name} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTenant.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeTenant.slug}
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
            {renderTenantGroup(
              "Your tenants",
              tenants.filter((tenant) => tenant.isMembership),
              startSwitching,
            )}
            {tenants.some((tenant) => tenant.isMembership) &&
              tenants.some((tenant) => !tenant.isMembership) && (
                <DropdownMenuSeparator />
              )}
            {renderTenantGroup(
              "Support access",
              tenants.filter((tenant) => !tenant.isMembership),
              startSwitching,
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function renderTenantGroup(
  label: string,
  tenants: SwitcherTenant[],
  startSwitching: React.TransitionStartFunction,
) {
  if (tenants.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">
        {label}
      </DropdownMenuLabel>
      {tenants.map((tenant) => (
        <DropdownMenuItem
          key={tenant.id}
          disabled={tenant.isActive}
          onClick={() => {
            if (tenant.isActive) {
              return;
            }

            startSwitching(() => {
              void selectSwitcherTenantAction(tenant.id);
            });
          }}
          className="gap-2 p-2"
        >
          <TenantGlyph name={tenant.name} compact />
          {tenant.name}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function TenantGlyph({
  name,
  compact = false,
}: Readonly<{ name: string; compact?: boolean }>) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-md bg-sidebar-accent font-medium",
        compact ? "size-6 text-xs" : "aspect-square size-8 text-sm group-data-[collapsible=icon]:size-full",
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "T"}
    </div>
  );
}

const SingleTenantDisplay = ({
  tenant,
}: Readonly<{
  tenant: {
    name: string;
    logo: React.ElementType;
    href?: string;
  };
}>) => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:rounded-[3px] group-data-[collapsible=icon]:overflow-hidden">
          <a href={tenant.href ?? "/"}>
            {/* Collapsed: square icon */}
            <div className="hidden aspect-square size-full items-center justify-center group-data-[collapsible=icon]:flex">
              <tenant.logo className="size-8 shrink-0" />
            </div>
            {/* Expanded: icon + text wordmark as separate files for gap control */}
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <Image
                src={getPublicAssetPath("/assets/icons/endatix-paperclip-icon-blue.svg")}
                alt=""
                width={706}
                height={706}
                className="h-7 w-auto shrink-0 dark:hidden"
                aria-hidden
                priority
              />
              <Image
                src={getPublicAssetPath("/assets/icons/endatix-paperclip-icon-white.svg")}
                alt=""
                width={706}
                height={706}
                className="hidden h-7 w-auto shrink-0 dark:block"
                aria-hidden
                priority
              />
              <Image
                src={getPublicAssetPath("/assets/icons/endatix-wordmark-blue.svg")}
                alt="Endatix Hub"
                width={217}
                height={46}
                className="h-6 w-auto dark:hidden"
                priority
              />
              <Image
                src={getPublicAssetPath("/assets/icons/endatix-wordmark-white.svg")}
                alt="Endatix Hub"
                width={217}
                height={46}
                className="hidden h-6 w-auto dark:block"
                priority
              />
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
