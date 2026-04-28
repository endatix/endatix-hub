"use client";

import { useSession } from "next-auth/react";
import { ChevronsUpDown } from "lucide-react";
import { SitemapService } from "@/services/sitemap-service";
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

interface SidebarNavProps {
  dataListsEnabled?: boolean;
}

const SidebarNav = ({ dataListsEnabled = false }: SidebarNavProps) => {
  const { data: session } = useSession();
  const { state } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";
  const mainNavItems = SitemapService.getTopLevelSitemap().filter((item) => {
    if (item.key !== "dataLists") {
      return true;
    }

    return dataListsEnabled;
  });
  const secondaryNavItems = SitemapService.getSecondarySitemap();
  const isLoggedIn = session?.user !== null;
  const currentUserInfo = getCurrentUserInfo(session);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarNavItem key={item.title} item={item} isCollapsed={isSidebarCollapsed} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarNavItem key={item.title} item={item} isCollapsed={isSidebarCollapsed} size="sm" />
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

export default SidebarNav;
