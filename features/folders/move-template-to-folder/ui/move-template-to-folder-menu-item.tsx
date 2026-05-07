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
}

export function MoveTemplateToFolderMenuItem({
  templateId,
  currentFolderId,
}: MoveTemplateToFolderMenuItemProps) {
  const currentFolderValue = currentFolderId ?? NO_FOLDER_VALUE;
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentFolderValue,
  );
  const [isMovePending, setIsMovePending] = useState(false);

  const handleOpenMoveDialog = async () => {
    const listResult = await listFoldersAction();
    if (Result.isError(listResult)) {
      toast.error(listResult.message);
      return;
    }

    const activeFolders = listResult.value
      .filter((folder) => folder.isActive)
      .map((folder) => ({ id: folder.id, name: folder.name }));

    setAvailableFolders(activeFolders);
    setSelectedFolderId(currentFolderValue);
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
      toast.error({
        title: "Cannot move template to folder",
        description: moveResult.message,
      });
      return;
    }

    toast.success("Template moved");
    setMoveDialogOpen(false);
  };

  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer"
        onSelect={() => {
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
        canMove={selectedFolderId !== currentFolderValue}
        onMove={() => void handleMoveToFolder()}
      />
    </>
  );
}
