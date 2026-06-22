"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import TemplateSelector from "@/features/forms/ui/template-selector";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { FormTemplate } from "@/types";
import { CreateFormFolderSelect } from "./create-form-folder-select";
import { NO_FOLDER_ID } from "./types";

interface CreateFormTemplatePanelProps {
  folders: Folder[];
  requireFolderAssignment: boolean;
  selectedFolderId: string;
  selectedTemplate: FormTemplate | null;
  isPending: boolean;
  isCreatingForm: boolean;
  onTemplateSelect: (template: FormTemplate) => void;
  onPreviewTemplate: (templateId: string) => void;
  onSelectedFolderIdChange: (folderId: string) => void;
  onCreateFromTemplate: () => void;
}

export function CreateFormTemplatePanel({
  folders,
  requireFolderAssignment,
  selectedFolderId,
  selectedTemplate,
  isPending,
  isCreatingForm,
  onTemplateSelect,
  onPreviewTemplate,
  onSelectedFolderIdChange,
  onCreateFromTemplate,
}: Readonly<CreateFormTemplatePanelProps>) {
  const isFolderRequiredAndMissing =
    requireFolderAssignment && selectedFolderId === NO_FOLDER_ID;
  const isCreateDisabled =
    isPending ||
    isCreatingForm ||
    isFolderRequiredAndMissing ||
    (requireFolderAssignment && folders.length === 0);

  return (
    <div className="flex w-full flex-col gap-4">
      <TemplateSelector
        onTemplateSelect={onTemplateSelect}
        onPreviewTemplate={onPreviewTemplate}
      />
      <CreateFormFolderSelect
        folders={folders}
        requireFolderAssignment={requireFolderAssignment}
        selectedFolderId={selectedFolderId}
        onSelectedFolderIdChange={onSelectedFolderIdChange}
        disabled={isPending || isCreatingForm}
      />
      {selectedTemplate ? (
        <Button
          className="w-full"
          onClick={onCreateFromTemplate}
          disabled={isCreateDisabled}
        >
          {isPending || isCreatingForm ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : (
            "Create Form from Template"
          )}
        </Button>
      ) : null}
    </div>
  );
}
