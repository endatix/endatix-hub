import { FolderOpen } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { showStandingRefusal } from "@/components/error-handling/show-action-failure";
import type { Error as ResultError } from "@/lib/result";
import type { FolderChoice, MovableItem } from "../move-to-folder";

/** The dialog's title and its folder field's id. */
export function moveDialogLabels(item: MovableItem) {
  return {
    title: `Move ${item.kind} to folder`,
    fieldId: `move-${item.kind}-folder-${item.id}`,
  };
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

const capitalized = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** Success, with an "Open folder" action when the item went into a folder. */
export function toastMoved(
  item: MovableItem,
  target: FolderChoice | undefined,
  openFolder: (folder: FolderChoice) => void,
) {
  toast.success({
    title: `${capitalized(item.kind)} moved successfully`,
    description: (
      <MovedDescription name={item.name} folderName={target?.name} />
    ),
    SvgIcon: FolderOpen,
    action: target
      ? { label: "Open folder", onClick: () => openFolder(target) }
      : undefined,
  });
}

export function toastMoveFailed(
  kind: MovableItem["kind"],
  failure: ResultError,
) {
  if (failure.requiredAction)
    return showStandingRefusal(failure.requiredAction);
  toast.error({
    title: `Cannot move ${kind} to folder`,
    description: failure.message,
  });
}
