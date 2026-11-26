import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";
import { workspaceSlot } from "@/features/auth/server";

type TemplateFolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

async function TemplateFolderFormsHeaderPage({
  params,
}: Readonly<TemplateFolderHeaderPageProps>) {
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="templates" />;
}

export default workspaceSlot(TemplateFolderFormsHeaderPage);
