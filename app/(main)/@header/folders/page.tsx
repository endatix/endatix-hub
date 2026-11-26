import MainHeader from "@/components/layout-ui/header/main-header";
import { workspaceSlot } from "@/features/auth/server";
import { CreateFolderLinkButton } from "@/features/folders/create-folder";

function FoldersHeaderSlot() {
  return <MainHeader sticky actions={<CreateFolderLinkButton />} />;
}

export default workspaceSlot(FoldersHeaderSlot);
