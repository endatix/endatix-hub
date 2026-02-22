"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronsUpDown } from "lucide-react";
import { sitemap } from "@/lib/constants";
import { SitemapService } from "@/services/sitemap-service";
import UserAvatar from "@/components/user/user-avatar";
import NavUser from "./nav-user";
import { TenantSwitcher } from "@/components/layout-ui/sidebar/tenant-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getCurrentUserInfo } from "@/features/users/user-utils";

const SidebarNav = () => {
  const sitemapList = SitemapService.getTopLevelSitemap(true);
  const settingsNavItem = sitemap.settings;
  const { data: session } = useSession();

  const isLoggedIn = session?.user !== null;
  const currentUserInfo = getCurrentUserInfo(session);

  const navItems = [
    ...sitemapList.map((navItem) => ({
      title: navItem.text,
      url: navItem.path,
      icon: navItem.IconType,
    })),
    {
      title: settingsNavItem.text,
      url: settingsNavItem.path,
      icon: settingsNavItem.IconType,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url as Route}>
                  {item.icon && <item.icon className="h-5 w-5" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
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
