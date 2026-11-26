import MainHeader from "@/components/layout-ui/header/main-header";
import { workspaceSlot } from "@/features/auth/server";
import { CreateDataListButton } from "@/features/data-lists/create-list";

function DataListsHeaderSlot() {
  return <MainHeader sticky actions={<CreateDataListButton />} />;
}

export default workspaceSlot(DataListsHeaderSlot);
