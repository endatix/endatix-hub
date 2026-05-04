import MainHeader from "@/components/layout-ui/header/main-header";
import { CreateDataListButton } from "@/features/data-lists/create-list";

export default function DataListsHeaderSlot() {
  return <MainHeader sticky actions={<CreateDataListButton />} />;
}
