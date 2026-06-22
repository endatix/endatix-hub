import type {
  FormsBreadcrumbItem,
  FormsNavFolder,
} from "@/features/folders/types";
import {
  parseFormsBrowseMode,
  type FormsBrowseMode,
} from "@/features/forms/list-forms/utils";
import type { Route } from "next";
import {
  folderSlugsMatch,
  safeDecodeURIComponent,
} from "@/features/folders/lib/folder-slug-matching";

type BuildFormsBreadcrumbModelParams = {
  section: "forms" | "templates";
  folders: Pick<FormsNavFolder, "name" | "slug">[];
  currentFolderSlug?: string | null;
  currentFolderName?: string | null;
  browse?: string | null;
};

export function buildFormsBreadcrumbModel({
  section,
  folders,
  currentFolderSlug,
  currentFolderName,
  browse,
}: BuildFormsBreadcrumbModelParams): FormsBreadcrumbItem[] {
  const unassignedHref = (
    section === "forms" ? "/forms" : "/forms/templates"
  ) as Route;
  const allFormsHref = (
    section === "forms" ? "/forms?browse=all" : "/forms/templates?browse=all"
  ) as Route;
  const folderBaseHref = (
    section === "forms" ? "/forms/folders" : "/forms/templates/folders"
  ) as Route;
  const sectionLabel = section === "forms" ? "Forms" : "Form Templates";
  const baseLink: FormsBreadcrumbItem = {
    type: "link",
    label: sectionLabel,
    href: unassignedHref,
  };

  const hasFolderContext = Boolean(currentFolderSlug?.trim());
  if (folders.length === 0 && !hasFolderContext) {
    return [baseLink];
  }

  const rootBrowseMode = parseFormsBrowseMode(browse ?? undefined);
  const options = buildFolderDropdownOptions({
    section,
    folders,
    currentFolderSlug,
    rootBrowseMode,
    unassignedHref,
    allFormsHref,
    folderBaseHref,
  });

  const folderLabel = resolveFolderDropdownLabel({
    section,
    currentFolderSlug,
    currentFolderName,
    folders,
    rootBrowseMode,
  });

  return [
    baseLink,
    {
      type: "dropdown",
      label: folderLabel,
      options,
    },
  ];
}

function buildFolderDropdownOptions({
  section,
  folders,
  currentFolderSlug,
  rootBrowseMode,
  unassignedHref,
  allFormsHref,
  folderBaseHref,
}: {
  section: "forms" | "templates";
  folders: Pick<FormsNavFolder, "name" | "slug">[];
  currentFolderSlug?: string | null;
  rootBrowseMode: FormsBrowseMode;
  unassignedHref: Route;
  allFormsHref: Route;
  folderBaseHref: Route;
}) {
  const { unassignedLabel, allLabel } = getRootBrowseLabels(section);

  return [
    {
      label: unassignedLabel,
      href: unassignedHref,
      isActive: !currentFolderSlug && rootBrowseMode === "unassigned",
    },
    {
      label: allLabel,
      href: allFormsHref,
      isActive: !currentFolderSlug && rootBrowseMode === "all",
    },
    ...folders.map((folder) => ({
      label: folder.name,
      href: `${folderBaseHref}/${encodeURIComponent(folder.slug)}` as Route,
      isActive:
        currentFolderSlug !== null &&
        currentFolderSlug !== undefined &&
        folderSlugsMatch(folder.slug, currentFolderSlug),
    })),
  ];
}

function resolveFolderDropdownLabel({
  section,
  currentFolderSlug,
  currentFolderName,
  folders,
  rootBrowseMode,
}: {
  section: "forms" | "templates";
  currentFolderSlug?: string | null;
  currentFolderName?: string | null;
  folders: Pick<FormsNavFolder, "name" | "slug">[];
  rootBrowseMode: FormsBrowseMode;
}): string {
  if (currentFolderSlug) {
    const resolvedName = currentFolderName?.trim();
    if (resolvedName) {
      return resolvedName;
    }

    const matchedFolder = folders.find((folder) =>
      folderSlugsMatch(folder.slug, currentFolderSlug),
    );
    if (matchedFolder) {
      return matchedFolder.name;
    }

    return safeDecodeURIComponent(currentFolderSlug);
  }

  const { unassignedLabel, allLabel } = getRootBrowseLabels(section);
  return rootBrowseMode === "all" ? allLabel : unassignedLabel;
}

function getRootBrowseLabels(section: "forms" | "templates") {
  return {
    unassignedLabel:
      section === "forms" ? "Unassigned" : "Unassigned templates",
    allLabel: section === "forms" ? "All forms" : "All form templates",
  };
}
