import { auth } from "@/auth";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { authorization, Permissions } from "@/features/auth/authorization";
import type { FormsHeaderData } from "@/features/folders/types";
import { CreateFormSheet } from "@/features/forms/use-cases/create-form";
import { mapNavFoldersForCreate } from "@/features/forms/use-cases/create-form/resolve-default-create-folder";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";

interface FormsHeaderCreateActionsProps {
  aiFeatureFlag: boolean;
  headerData: FormsHeaderData;
  defaultFolderId?: string;
  defaultFolderSlug?: string;
  defaultFolderName?: string;
}

export async function FormsHeaderCreateActions({
  aiFeatureFlag,
  headerData,
  defaultFolderId,
  defaultFolderSlug,
  defaultFolderName,
}: Readonly<FormsHeaderCreateActionsProps>) {
  const { checkPermission } = await authorization(await auth());
  const canCreateForms = await checkPermission(Permissions.Forms.Create);
  if (!canCreateForms.success) {
    return null;
  }

  let initialFolders = undefined;
  if (headerData.folders !== undefined) {
    initialFolders = mapNavFoldersForCreate(headerData.folders);
  }

  const assignableFolders = headerData.folders?.map((folder) => ({
    id: folder.id,
    name: folder.name,
  }));

  return (
    <AssetStorageProvider>
      <FormAssistantProvider
        isAssistantEnabled={aiFeatureFlag}
        requireFolderForNewForms={headerData.requireFolderForNewForms}
        assignableFolders={assignableFolders}
        defaultAssignFolderId={defaultFolderId}
      >
        <CreateFormSheet
          key={defaultFolderId ?? defaultFolderSlug ?? "forms-root"}
          defaultFolderId={defaultFolderId}
          defaultFolderSlug={defaultFolderSlug}
          defaultFolderName={defaultFolderName}
          initialFolders={initialFolders}
          initialRequireFolderAssignment={headerData.requireFolderForNewForms}
        />
      </FormAssistantProvider>
    </AssetStorageProvider>
  );
}
