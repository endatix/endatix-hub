import { FormsFolderHeaderSlot } from "@/features/folders/view-forms-header";

type TemplateFolderHeaderPageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function TemplateFolderFormsHeaderPage({
  params,
}: Readonly<TemplateFolderHeaderPageProps>) {
  const { folderSlug } = await params;
  return <FormsFolderHeaderSlot folderSlug={folderSlug} section="templates" />;
}
