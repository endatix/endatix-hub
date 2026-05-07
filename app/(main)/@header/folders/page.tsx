import MainHeader from "@/components/layout-ui/header/main-header";
import { CreateFolderButton } from "@/features/folders/ui/create-folder-button";

export default function FoldersHeaderSlot() {
  return <MainHeader sticky actions={<CreateFolderButton />} />;
}
