import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";

type FolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function FolderFormsHeaderPage({
  params,
}: Readonly<FolderHeaderPageProps>) {
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="forms" />;
}
