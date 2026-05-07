"use client";

import { useState } from "react";
import { FolderInput } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { listFoldersAction } from "@/features/folders/server";
import { moveTemplateToFolderAction } from "../move-template-to-folder.action";
import {
  MoveToFolderDialog,
  NO_FOLDER_VALUE,
} from "@/features/folders/ui/move-to-folder-dialog";

interface MoveTemplateToFolderMenuItemProps {
  templateId: string;
  currentFolderId: string | null;
  onActionHandled?: () => void;
}

export function MoveTemplateToFolderMenuItem({
  templateId,
  currentFolderId,
  onActionHandled,
}: MoveTemplateToFolderMenuItemProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentFolderId ?? NO_FOLDER_VALUE,
  );
  const [isMovePending, setIsMovePending] = useState(false);

  const handleOpenMoveDialog = async () => {
    onActionHandled?.();
    const listResult = await listFoldersAction();
    if (Result.isError(listResult)) {
      toast.error(listResult.message);
      return;
    }

    const activeFolders = listResult.value
      .filter((folder) => folder.isActive)
      .map((folder) => ({ id: folder.id, name: folder.name }));

    setAvailableFolders(activeFolders);
    setSelectedFolderId(currentFolderId ?? NO_FOLDER_VALUE);
    setMoveDialogOpen(true);
  };

  const handleMoveToFolder = async () => {
    setIsMovePending(true);
    const moveResult = await moveTemplateToFolderAction(
      templateId,
      selectedFolderId === NO_FOLDER_VALUE ? null : selectedFolderId,
    );
    setIsMovePending(false);

    if (Result.isError(moveResult)) {
      toast.error(moveResult.message);
      return;
    }

    toast.success("Template moved");
    setMoveDialogOpen(false);
  };

  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer"
        onSelect={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleOpenMoveDialog();
        }}
      >
        <FolderInput className="mr-2 h-4 w-4" />
        Move to folder
      </DropdownMenuItem>
      <MoveToFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        title="Move template to folder"
        fieldId={`move-template-folder-${templateId}`}
        selectedFolderId={selectedFolderId}
        onFolderChange={setSelectedFolderId}
        folderOptions={availableFolders}
        isMovePending={isMovePending}
        onMove={() => void handleMoveToFolder()}
      />
    </>
  );
}
