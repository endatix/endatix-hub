import MainHeader from "@/components/layout-ui/header/main-header";
import { CreateFolderLinkButton } from "@/features/folders/create-folder";

export default function FoldersHeaderSlot() {
  return <MainHeader sticky actions={<CreateFolderLinkButton />} />;
}
