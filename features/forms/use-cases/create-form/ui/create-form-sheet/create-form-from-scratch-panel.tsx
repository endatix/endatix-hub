"use client";

import { Spinner } from "@/components/loaders/spinner";
import CreateFormWizard, {
  CREATE_FORM_WIZARD_ACTIONS_ELEMENT_ID,
} from "../../create-form-wizard";
import type { Folder } from "@/lib/endatix-api/folders/types";

interface CreateFormFromScratchPanelProps {
  canRenderWizard: boolean;
  requireFolderAssignment: boolean;
  folders: Folder[];
  effectiveFolderId?: string;
  effectiveFolderName?: string;
  onCancel: () => void;
}

export function CreateFormFromScratchPanel({
  canRenderWizard,
  requireFolderAssignment,
  folders,
  effectiveFolderId,
  effectiveFolderName,
  onCancel,
}: Readonly<CreateFormFromScratchPanelProps>) {
  return (
    <div className="flex w-full flex-col gap-4">
      {canRenderWizard ? (
        <CreateFormWizard
          key={`${effectiveFolderId ?? "create-form-sheet"}-${effectiveFolderName ?? "no-folder"}`}
          requireFolderAssignment={requireFolderAssignment}
          folders={folders}
          defaultFolderId={effectiveFolderId}
          defaultFolderName={effectiveFolderName}
          actionsElementId={CREATE_FORM_WIZARD_ACTIONS_ELEMENT_ID}
          onCancel={onCancel}
        />
      ) : (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
