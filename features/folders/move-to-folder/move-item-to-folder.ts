import { Result } from "@/lib/result";
import { listFoldersAction } from "../list-folders/list-folders.action";
import { moveFormToFolderAction } from "../move-form-to-folder/move-form-to-folder.action";
import { moveTemplateToFolderAction } from "../move-template-to-folder/move-template-to-folder.action";
import {
  choosableFolders,
  type FolderChoice,
  type MovableItem,
  type MovableKind,
} from "./move-to-folder";

type MoveAction = (
  id: string,
  folderId: string | null,
) => Promise<Result<void>>;

const MOVE_ACTIONS: Record<MovableKind, MoveAction> = {
  form: moveFormToFolderAction,
  template: moveTemplateToFolderAction,
};

/** Moves a form or a template into a folder, or out of its folder when `folderId` is `null`. */
export function moveItemToFolder(
  item: Pick<MovableItem, "kind" | "id">,
  folderId: string | null,
): Promise<Result<void>> {
  return MOVE_ACTIONS[item.kind](item.id, folderId);
}

/** The folders a move can target. */
export async function loadFolderChoices(): Promise<Result<FolderChoice[]>> {
  const listed = await listFoldersAction();
  return Result.isError(listed)
    ? listed
    : Result.success(choosableFolders(listed.value));
}
