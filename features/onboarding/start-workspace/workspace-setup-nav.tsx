import { ListChecks } from "lucide-react";
import { Suspense } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { canResumeWorkspaceSetup } from "./workspace-api.server";
import { WorkspaceSetupLink } from "./workspace-setup-link";

async function OwnerSetupItem() {
  if (!(await canResumeWorkspaceSetup())) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild size="sm" tooltip="Workspace setup">
        <WorkspaceSetupLink>
          <ListChecks aria-hidden="true" />
          <span>Workspace setup</span>
        </WorkspaceSetupLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function WorkspaceSetupNav() {
  return <Suspense fallback={null}><OwnerSetupItem /></Suspense>;
}
