import { AssetStorageProvider } from "@/features/asset-storage/server";
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

export function FormsHeaderCreateActions({
  aiFeatureFlag,
  headerData,
  defaultFolderId,
  defaultFolderSlug,
  defaultFolderName,
}: Readonly<FormsHeaderCreateActionsProps>) {
  const initialFolders = mapNavFoldersForCreate(headerData.folders);

  return (
    <AssetStorageProvider>
      <FormAssistantProvider
        isAssistantEnabled={aiFeatureFlag}
        requireFolderForNewForms={headerData.requireFolderForNewForms}
        assignableFolders={headerData.assignableFolders}
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
