import MainHeader from "@/components/layout-ui/header/main-header";
import { CreateDataListHeaderAction } from "@/features/data-lists/list/create-data-list-header-action";

export default function DataListsHeaderSlot() {
  return <MainHeader sticky actions={<CreateDataListHeaderAction />} />;
}
