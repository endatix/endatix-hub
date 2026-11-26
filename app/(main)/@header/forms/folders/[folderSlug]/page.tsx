import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";
import { workspaceActionTarget } from "@/features/auth/server";

type FolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function FolderFormsHeaderPage({
  params,
}: Readonly<FolderHeaderPageProps>) {
  if (await workspaceActionTarget()) return null;
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="forms" />;
}
