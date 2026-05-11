import type {
  FormsBreadcrumbItem,
  FormsNavFolder,
} from "@/features/folders/types";
import type { Route } from "next";

type BuildFormsBreadcrumbModelParams = {
  section: "forms" | "templates";
  folders: Pick<FormsNavFolder, "name" | "slug">[];
  currentFolderSlug?: string | null;
};

export function buildFormsBreadcrumbModel({
  section,
  folders,
  currentFolderSlug,
}: BuildFormsBreadcrumbModelParams): FormsBreadcrumbItem[] {
  const allHref = (
    section === "forms" ? "/forms" : "/forms/templates"
  ) as Route;
  const folderBaseHref = (
    section === "forms" ? "/forms/folders" : "/forms/templates/folders"
  ) as Route;
  const sectionLabel = section === "forms" ? "Forms" : "Form Templates";
  const allLabel = section === "forms" ? "All Forms" : "All Form Templates";
  const baseLink: FormsBreadcrumbItem = {
    type: "link",
    label: sectionLabel,
    href: allHref,
  };

  const options = [
    { label: allLabel, href: allHref, isActive: !currentFolderSlug },
    ...folders.map((folder) => ({
      label: folder.name,
      href: `${folderBaseHref}/${encodeURIComponent(folder.slug)}` as Route,
      isActive: currentFolderSlug === folder.slug,
    })),
  ];

  if (folders.length === 0) {
    return [baseLink];
  }

  const currentFolderName = currentFolderSlug
    ? (folders.find((folder) => folder.slug === currentFolderSlug)?.name ??
      currentFolderSlug)
    : null;

  const folderLabel = currentFolderName ?? "Choose folder";

  return [
    baseLink,
    {
      type: "dropdown",
      label: folderLabel,
      options,
    },
  ];
}
