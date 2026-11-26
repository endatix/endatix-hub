import SidebarNav from "@/components/layout-ui/sidebar/sidebar-nav";
import { workspaceSlot } from "@/features/auth/server";
import { getAuthorizedNavItemKeys } from "@/features/navigation/filter-nav-by-auth/server";

async function DefaultNavSlot() {
  const navItemKeys = await getAuthorizedNavItemKeys();

  return <SidebarNav initialNavItemKeys={navItemKeys} />;
}

export default workspaceSlot(DefaultNavSlot);
