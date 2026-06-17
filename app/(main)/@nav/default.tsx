import SidebarNav from "@/components/layout-ui/sidebar/sidebar-nav";
import { getAuthorizedNavItemKeys } from "@/features/navigation/filter-nav-by-auth/server";

export default async function DefaultNavSlot() {
  const navItemKeys = await getAuthorizedNavItemKeys();

  return <SidebarNav initialNavItemKeys={navItemKeys} />;
}
