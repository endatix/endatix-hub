"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MoveToFolderOption {
  id: string;
  name: string;
}

export const NO_FOLDER_VALUE = "__none__";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fieldId: string;
  selectedFolderId: string;
  onFolderChange: (value: string) => void;
  folderOptions: MoveToFolderOption[];
  isMovePending: boolean;
  canMove: boolean;
  onMove: () => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  title,
  fieldId,
  selectedFolderId,
  onFolderChange,
  folderOptions,
  isMovePending,
  canMove,
  onMove,
}: MoveToFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Select a destination folder for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>Folder</Label>
          <Select value={selectedFolderId} onValueChange={onFolderChange}>
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_FOLDER_VALUE}>No folder</SelectItem>
                {folderOptions.map((folderOption) => (
                  <SelectItem key={folderOption.id} value={folderOption.id}>
                    {folderOption.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMove();
            }}
            disabled={isMovePending || !canMove}
          >
            {isMovePending ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
