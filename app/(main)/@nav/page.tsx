import { auth } from "@/auth";
import SidebarNav from "@/components/layout-ui/sidebar/sidebar-nav";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";

export default async function NavSlot() {
  const session = await auth();
  const headerData = await getFormsHeaderDataCached(session?.accessToken);

  return <SidebarNav initialFolders={headerData.folders} />;
}
