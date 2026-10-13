"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { listFoldersAction } from "@/features/folders/server";
import {
  NO_FOLDER_VALUE,
  type MoveToFolderDialog,
  type MoveToFolderOption,
} from "./move-to-folder-dialog";

type FolderOption = MoveToFolderOption & { slug?: string };

/** What a card moves: a form or a template, by id, with the folder it is in now. */
export interface MovableItem {
  kind: "form" | "template";
  id: string;
  name: string;
  folderId?: string | null;
}

interface UseMoveToFolderOptions {
  item: MovableItem;
  move: (id: string, folderId: string | null) => Promise<Result<void>>;
  folderRoute: (slug: string) => Route;
}

type MoveToFolderDialogProps = Parameters<typeof MoveToFolderDialog>[0];

/** Active folders for the picker, or `null` after an error toast. */
async function loadActiveFolders(): Promise<FolderOption[] | null> {
  const listResult = await listFoldersAction();
  if (Result.isError(listResult)) {
    toast.error(listResult.message);
    return null;
  }

  return listResult.value
    .filter((folder) => folder.isActive)
    .map((folder) => ({ id: folder.id, name: folder.name, slug: folder.slug }));
}

function MovedDescription({
  name,
  folderName,
}: Readonly<{ name: string; folderName?: string }>) {
  return (
    <>
      <strong>{name}</strong>
      {folderName ? (
        <>
          {" "}
          was moved to <strong>{folderName}</strong>.
        </>
      ) : (
        <> was removed from its folder.</>
      )}
    </>
  );
}

const capitalized = (kind: MovableItem["kind"]) =>
  kind.charAt(0).toUpperCase() + kind.slice(1);

function toastMoved(
  item: MovableItem,
  target: FolderOption | undefined,
  openFolder: (slug: string) => void,
) {
  const slug = target?.slug;
  toast.success({
    title: `${capitalized(item.kind)} moved successfully`,
    description: (
      <MovedDescription name={item.name} folderName={target?.name} />
    ),
    SvgIcon: FolderOpen,
    action: slug
      ? { label: "Open folder", onClick: () => openFolder(slug) }
      : undefined,
  });
}

/** The folder the item is in now. It follows the item when the list reloads it. */
function useCurrentFolder(folderId: string | null | undefined) {
  const [current, setCurrent] = useState(folderId ?? NO_FOLDER_VALUE);
  useEffect(() => {
    setCurrent(folderId ?? NO_FOLDER_VALUE);
  }, [folderId]);
  return [current, setCurrent] as const;
}

interface Picker {
  isOpen: boolean;
  selected: string;
  options: FolderOption[];
}

/** The picker's state: the folder the item is in, whether it is open, the folder picked, and the options. */
function useFolderSelection(folderId: string | null | undefined) {
  const [current, setCurrent] = useCurrentFolder(folderId);
  const [picker, setPicker] = useState<Picker>({
    isOpen: false,
    selected: current,
    options: [],
  });
  const update = (change: Partial<Picker>) =>
    setPicker((state) => ({ ...state, ...change }));
  const open = (options: FolderOption[]) =>
    update({ isOpen: true, selected: current, options });
  const moved = () => {
    setCurrent(picker.selected);
    update({ isOpen: false });
  };
  return { current, ...picker, update, open, moved };
}

type FolderSelection = ReturnType<typeof useFolderSelection>;

/** Moves the item to the picked folder. `null` after an error toast, else the folder it went to, if any. */
async function moveToSelected(
  item: MovableItem,
  selection: FolderSelection,
  move: UseMoveToFolderOptions["move"],
): Promise<{ target?: FolderOption } | null> {
  const folderId =
    selection.selected === NO_FOLDER_VALUE ? null : selection.selected;
  const moveResult = await move(item.id, folderId);
  if (Result.isError(moveResult)) {
    toast.error({
      title: `Cannot move ${item.kind} to folder`,
      description: moveResult.message,
    });
    return null;
  }

  return { target: selection.options.find((folder) => folder.id === folderId) };
}

type Moving = Pick<MoveToFolderDialogProps, "isMovePending" | "onMove">;

/** The dialog's Move button: moves, then toasts with a link to the folder and closes the picker. */
function useMoveAction(
  options: UseMoveToFolderOptions,
  selection: FolderSelection,
): Moving {
  const { item, move, folderRoute } = options;
  const router = useRouter();
  const [isMovePending, setIsMovePending] = useState(false);
  const moveToFolder = async () => {
    if (selection.selected === selection.current) return;
    setIsMovePending(true);
    const moved = await moveToSelected(item, selection, move);
    setIsMovePending(false);
    if (!moved) return;
    toastMoved(item, moved.target, (slug) => router.push(folderRoute(slug)));
    selection.moved();
  };
  return { isMovePending, onMove: () => void moveToFolder() };
}

function dialogPropsFor(
  item: MovableItem,
  selection: FolderSelection,
  moving: Moving,
): MoveToFolderDialogProps {
  return {
    open: selection.isOpen,
    onOpenChange: (isOpen) => selection.update({ isOpen }),
    title: `Move ${item.kind} to folder`,
    fieldId: `move-${item.kind}-folder-${item.id}`,
    selectedFolderId: selection.selected,
    onFolderChange: (selected) => selection.update({ selected }),
    folderOptions: selection.options,
    canMove: selection.selected !== selection.current,
    ...moving,
  };
}

/**
 * Moving one form or template to a folder from its card. `openMoveDialog` loads the folders and opens the
 * picker; spread `dialogProps` onto `MoveToFolderDialog`.
 */
export function useMoveToFolder(options: Readonly<UseMoveToFolderOptions>) {
  const selection = useFolderSelection(options.item.folderId);
  const moving = useMoveAction(options, selection);
  const openMoveDialog = async () => {
    const loaded = await loadActiveFolders();
    if (loaded) selection.open(loaded);
  };
  const dialogProps = dialogPropsFor(options.item, selection, moving);
  return { openMoveDialog, dialogProps };
}
