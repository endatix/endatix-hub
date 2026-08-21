"use client";

import { useSession } from "next-auth/react";
import { mergeTopLevelNavWithFolderForms } from "@/features/folders/utils";
import { listFoldersAction } from "@/features/folders/server";
import { listMyTenantsAction } from "@/features/tenants/switch-tenant/switch-tenant.action";
import { Result } from "@/lib/result";
import type { MembershipTenant } from "@/lib/endatix-api";
import { ChevronsUpDown } from "lucide-react";
import { SitemapService } from "@/services/sitemap-service";
import { filterNavByKeys } from "@/features/navigation/filter-nav-by-auth";
import UserAvatar from "@/components/user/user-avatar";
import NavUser from "./nav-user";
import { TenantSwitcher } from "@/components/layout-ui/sidebar/tenant-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { getCurrentUserInfo } from "@/features/users/user-utils";
import { SidebarNavItem } from "./sidebar-nav-item";
import type { INavItem } from "@/types/navigation-models";
import { useEffect, useState } from "react";

type SidebarFolder = {
  id: string;
  name: string;
  slug: string;
};

type SidebarNavProps = {
  initialFolders?: SidebarFolder[];
  initialNavItemKeys?: string[];
};

const SidebarNav = ({
  initialFolders,
  initialNavItemKeys,
}: Readonly<SidebarNavProps>) => {
  const { data: session, status } = useSession();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";
  const [mainNavItems, setMainNavItems] = useState<INavItem[]>(() => {
    const base = getAuthorizedNavItems(initialNavItemKeys);
    return initialFolders && initialFolders.length > 0
      ? mergeTopLevelNavWithFolderForms(base, initialFolders)
      : base;
  });
  const [tenants, setTenants] = useState<MembershipTenant[] | undefined>();
  const secondaryNavItems = SitemapService.getSecondarySitemap();
  const isLoggedIn = session?.user !== null;
  const currentUserInfo = getCurrentUserInfo(session);

  useEffect(() => {
    if (initialFolders) {
      return;
    }

    if (status !== "authenticated" || !session) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await listFoldersAction();
      if (cancelled) {
        return;
      }
      const base = getAuthorizedNavItems(initialNavItemKeys);
      if (!Result.isSuccess(result)) {
        setMainNavItems(base);
        return;
      }
      setMainNavItems(mergeTopLevelNavWithFolderForms(base, result.value));
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session, initialFolders, initialNavItemKeys]);

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await listMyTenantsAction();
      if (cancelled) {
        return;
      }

      setTenants(Result.isSuccess(result) ? result.value : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TenantSwitcher tenants={tenants} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarNavItem
                key={item.title}
                item={item}
                isCollapsed={isSidebarCollapsed}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  item={item}
                  isCollapsed={isSidebarCollapsed}
                  size="sm"
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavUser
              currentUser={currentUserInfo}
              trigger={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip="Account"
                >
                  <UserAvatar
                    className="h-8 w-8 rounded-lg"
                    isLoggedIn={isLoggedIn}
                    displayName={currentUserInfo?.displayName}
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {currentUserInfo?.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {isLoggedIn ? "Signed in" : "Sign in"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

function getAuthorizedNavItems(initialNavItemKeys?: string[]): INavItem[] {
  return filterNavByKeys(SitemapService.getTopLevelSitemap(), initialNavItemKeys);
}

export default SidebarNav;
