import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";
import { workspaceSlot } from "@/features/auth/server";

type FolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

async function FolderFormsHeaderPage({
  params,
}: Readonly<FolderHeaderPageProps>) {
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="forms" />;
}

export default workspaceSlot(FolderFormsHeaderPage);
