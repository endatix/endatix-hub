"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { NO_FOLDER_ID } from "./types";

interface CreateFormFolderSelectProps {
  folders: Folder[];
  requireFolderAssignment: boolean;
  selectedFolderId: string;
  onSelectedFolderIdChange: (folderId: string) => void;
  disabled?: boolean;
}

export function CreateFormFolderSelect({
  folders,
  requireFolderAssignment,
  selectedFolderId,
  onSelectedFolderIdChange,
  disabled = false,
}: Readonly<CreateFormFolderSelectProps>) {
  const showFolderSelect = folders.length > 0 || requireFolderAssignment;

  if (!showFolderSelect) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="create-form-sheet-folder-id">
        Folder
        {requireFolderAssignment ? (
          <span className="text-destructive"> *</span>
        ) : (
          " (optional)"
        )}
      </Label>
      <Select
        value={selectedFolderId}
        onValueChange={onSelectedFolderIdChange}
        disabled={disabled}
      >
        <SelectTrigger id="create-form-sheet-folder-id" className="w-full">
          <SelectValue
            placeholder={
              requireFolderAssignment ? "Select a folder" : "No folder"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {!requireFolderAssignment ? (
              <SelectItem value={NO_FOLDER_ID}>No folder</SelectItem>
            ) : null}
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={String(folder.id)}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {requireFolderAssignment ? (
        <p className="text-sm text-muted-foreground">
          A folder is required by your organization policy.
        </p>
      ) : null}
      {requireFolderAssignment && folders.length === 0 ? (
        <p className="text-sm text-destructive">
          No active folders exist. Create a folder under Forms → Folders before
          creating a form.
        </p>
      ) : null}
    </div>
  );
}
