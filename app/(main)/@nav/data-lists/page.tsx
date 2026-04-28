import SidebarNav from '@/components/layout-ui/sidebar/sidebar-nav';
import { dataListsFlag } from '@/lib/feature-flags';

export default async function NavSlot() {
  const dataListsEnabled = await dataListsFlag();

  return <SidebarNav dataListsEnabled={dataListsEnabled} />;
}
