"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import CreateFormWizard from "../../create-form-wizard";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { Route } from "next";

interface CreateFormFromScratchPanelProps {
  canRenderWizard: boolean;
  requireFolderAssignment: boolean;
  folders: Folder[];
  effectiveFolderId?: string;
  effectiveFolderName?: string;
  cancelHref: Route;
  onBack: () => void;
}

export function CreateFormFromScratchPanel({
  canRenderWizard,
  requireFolderAssignment,
  folders,
  effectiveFolderId,
  effectiveFolderName,
  cancelHref,
  onBack,
}: Readonly<CreateFormFromScratchPanelProps>) {
  return (
    <div className="flex w-full flex-col gap-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-0"
        onClick={onBack}
      >
        ← Back to options
      </Button>
      {canRenderWizard ? (
        <CreateFormWizard
          key={`${effectiveFolderId ?? "create-form-sheet"}-${effectiveFolderName ?? "no-folder"}`}
          requireFolderAssignment={requireFolderAssignment}
          folders={folders}
          defaultFolderId={effectiveFolderId}
          defaultFolderName={effectiveFolderName}
          cancelHref={cancelHref}
        />
      ) : (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
