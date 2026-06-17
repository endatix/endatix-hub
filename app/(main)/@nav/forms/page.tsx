import { auth } from "@/auth";
import SidebarNav from "@/components/layout-ui/sidebar/sidebar-nav";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { getAuthorizedNavItemKeys } from "@/features/navigation/filter-nav-by-auth/server";

export default async function NavSlot() {
  const session = await auth();
  const [headerData, navItemKeys] = await Promise.all([
    getFormsHeaderDataCached(session?.accessToken),
    getAuthorizedNavItemKeys(),
  ]);

  return (
    <SidebarNav
      initialFolders={headerData.folders}
      initialNavItemKeys={navItemKeys}
    />
  );
}
