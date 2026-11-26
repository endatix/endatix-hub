import SidebarNav from "@/components/layout-ui/sidebar/sidebar-nav";
import { WorkspaceSetupNav } from "@/features/onboarding/start-workspace/workspace-setup-nav";
import { workspaceSlot } from "@/features/auth/server";
import { getAuthorizedNavItemKeys } from "@/features/navigation/filter-nav-by-auth/server";

async function DefaultNavSlot() {
  const navItemKeys = await getAuthorizedNavItemKeys();

  return <SidebarNav initialNavItemKeys={navItemKeys}><WorkspaceSetupNav /></SidebarNav>;
}

export default workspaceSlot(DefaultNavSlot);
