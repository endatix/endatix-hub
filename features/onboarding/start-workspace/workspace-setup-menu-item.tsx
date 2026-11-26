"use client";

import { ListChecks } from "lucide-react";
import Link from "next/link";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";

export function WorkspaceSetupMenuItem() {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild size="sm" tooltip="Workspace setup">
        <Link href={workspaceSetupHref} aria-label="Workspace setup" onNavigate={() => setOpenMobile(false)}>
          <ListChecks aria-hidden="true" />
          <span>Workspace setup</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
