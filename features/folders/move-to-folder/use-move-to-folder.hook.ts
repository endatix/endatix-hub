"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Result } from "@/lib/result";
import {
  canMove,
  folderHref,
  pickerValue,
  targetFolderId,
  type FolderChoice,
  type MovableItem,
} from "./move-to-folder";
import { loadFolderChoices, moveItemToFolder } from "./move-item-to-folder";
import type { MoveToFolderDialogProps } from "./ui/move-to-folder-dialog";
import {
  moveDialogLabels,
  toastFoldersUnavailable,
  toastMoved,
  toastMoveFailed,
} from "./ui/move-to-folder-copy";

/** The folder the item is in now. It follows the item when the list reloads it. */
function useCurrentFolder(folderId: string | null | undefined) {
  const [current, setCurrent] = useState(pickerValue(folderId));
  useEffect(() => {
    setCurrent(pickerValue(folderId));
  }, [folderId]);
  return [current, setCurrent] as const;
}

interface Picker {
  isOpen: boolean;
  picked: string;
  options: FolderChoice[];
}

/** The picker: the folder the item is in, whether it is open, the folder picked, and the options. */
function useFolderChoice(folderId: string | null | undefined) {
  const [current, setCurrent] = useCurrentFolder(folderId);
  const [picker, setPicker] = useState<Picker>({
    isOpen: false,
    picked: current,
    options: [],
  });
  const update = (change: Partial<Picker>) =>
    setPicker((state) => ({ ...state, ...change }));
  const open = (options: FolderChoice[]) =>
    update({ isOpen: true, picked: current, options });
  const moved = () => {
    setCurrent(picker.picked);
    update({ isOpen: false });
  };
  return { current, ...picker, update, open, moved };
}

type FolderChoiceState = ReturnType<typeof useFolderChoice>;
type Moving = Pick<MoveToFolderDialogProps, "isMovePending" | "onMove">;

/** The Move button: runs the move, reports it, and closes the picker on success. */
function useMoveWrite(item: MovableItem, choice: FolderChoiceState): Moving {
  const router = useRouter();
  const [isMovePending, setIsMovePending] = useState(false);
  const move = async () => {
    if (!canMove(choice.picked, choice.current)) return;
    setIsMovePending(true);
    const folderId = targetFolderId(choice.picked);
    const result = await moveItemToFolder(item, folderId);
    setIsMovePending(false);
    if (Result.isError(result)) return toastMoveFailed(item, result.message);
    const target = choice.options.find((folder) => folder.id === folderId);
    toastMoved(item, target, (folder) =>
      router.push(folderHref(item.kind, folder.slug) as Route),
    );
    choice.moved();
  };
  return { isMovePending, onMove: () => void move() };
}

function dialogPropsFor(
  item: MovableItem,
  choice: FolderChoiceState,
  moving: Moving,
): MoveToFolderDialogProps {
  return {
    ...moveDialogLabels(item),
    open: choice.isOpen,
    onOpenChange: (isOpen) => choice.update({ isOpen }),
    selectedFolderId: choice.picked,
    onFolderChange: (picked) => choice.update({ picked }),
    folderOptions: choice.options,
    canMove: canMove(choice.picked, choice.current),
    ...moving,
  };
}

/**
 * Moving one form or template to a folder. `openMoveDialog` loads the folders and opens the picker;
 * spread `dialogProps` onto `MoveToFolderDialog`.
 */
export function useMoveToFolder(item: MovableItem) {
  const choice = useFolderChoice(item.folderId);
  const moving = useMoveWrite(item, choice);
  const openMoveDialog = async () => {
    const choices = await loadFolderChoices();
    if (Result.isError(choices))
      return toastFoldersUnavailable(choices.message);
    choice.open(choices.value);
  };
  return { openMoveDialog, dialogProps: dialogPropsFor(item, choice, moving) };
}
