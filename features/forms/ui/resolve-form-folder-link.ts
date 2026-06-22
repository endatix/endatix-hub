import type { FormsNavFolder } from "@/features/folders/types";
import type { Form } from "@/types";
import type { FormFolderLinkProps } from "./form-folder-link";

export function resolveFormFolderLink(
  form: Pick<Form, "folderId">,
  folders: ReadonlyArray<
    Pick<FormsNavFolder, "id" | "name" | "slug" | "immutable" | "isActive">
  >,
): FormFolderLinkProps {
  if (!form.folderId) {
    return { label: "Unassigned", unassigned: true };
  }

  const folder = folders.find((candidate) => candidate.id === form.folderId);
  if (!folder) {
    return { label: "Folder" };
  }

  return {
    label: folder.name,
    immutable: folder.immutable,
    isActive: folder.isActive,
    folderSlug: folder.slug,
  };
}
