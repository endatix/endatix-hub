import type { Folder } from "@/lib/endatix-api/folders/types";
import type { PageError } from "@/lib/errors/page-error";
import type { FolderContentsPreview } from "@/features/folders/view-folder-management/folder-contents-preview";
import type { Route } from "next";
import type { Form, FormTemplate } from "@/types";

export type FormsNavFolder = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  immutable: boolean;
};

export type FormsHeaderData = {
  requireFolderForNewForms: boolean;
  folders: FormsNavFolder[];
  assignableFolders: Array<{ id: string; name: string }>;
};

type BreadcrumbLinkItem = {
  type: "link";
  label: string;
  href: Route;
};

type BreadcrumbPageItem = {
  type: "page";
  label: string;
};

type BreadcrumbDropdownItem = {
  type: "dropdown";
  label: string;
  options: Array<{
    label: string;
    href: Route;
    isActive?: boolean;
  }>;
};

export type FormsBreadcrumbItem =
  | BreadcrumbLinkItem
  | BreadcrumbPageItem
  | BreadcrumbDropdownItem;

export type FolderManagementDetailSuccess = {
  folder: Folder;
  allFolders: Folder[];
};

export type FolderManagementDetailFailure = PageError;

export type FolderManagementDetailResult =
  | { ok: true; data: FolderManagementDetailSuccess }
  | { ok: false; error: FolderManagementDetailFailure };

export type FolderManagementPageData = {
  folder: Folder;
  forms: readonly Form[];
  templates: readonly FormTemplate[];
  moveTargetFolders: readonly Folder[];
  contentsPreview: FolderContentsPreview;
};

export type FolderManagementPageResult =
  | { ok: true; data: FolderManagementPageData }
  | { ok: false; error: PageError };
