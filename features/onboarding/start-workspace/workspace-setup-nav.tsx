import { Suspense } from "react";
import { canResumeWorkspaceSetup } from "./workspace-api.server";
import { WorkspaceSetupMenuItem } from "./workspace-setup-menu-item";

async function OwnerSetupItem() {
  return await canResumeWorkspaceSetup() ? <WorkspaceSetupMenuItem /> : null;
}

export function WorkspaceSetupNav() {
  return <Suspense fallback={null}><OwnerSetupItem /></Suspense>;
}
