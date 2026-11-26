import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";
import { workspaceActionTarget } from "@/features/auth/server";

type TemplateFolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function TemplateFolderFormsHeaderPage({
  params,
}: Readonly<TemplateFolderHeaderPageProps>) {
  if (await workspaceActionTarget()) return null;
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="templates" />;
}
