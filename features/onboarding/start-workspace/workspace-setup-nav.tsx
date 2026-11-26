import { ListChecks } from "lucide-react";
import { Suspense } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { canResumeWorkspaceSetup } from "./workspace-api.server";
import Link from "next/link";
import { workspaceSetupHref } from "@/lib/routes/workspace-path";

async function OwnerSetupItem() {
  if (!(await canResumeWorkspaceSetup())) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild size="sm" tooltip="Workspace setup">
        <Link href={workspaceSetupHref} aria-label="Workspace setup">
          <ListChecks aria-hidden="true" />
          <span>Workspace setup</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function WorkspaceSetupNav() {
  return <Suspense fallback={null}><OwnerSetupItem /></Suspense>;
}
