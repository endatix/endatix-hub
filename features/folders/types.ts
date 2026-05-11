import type { Folder } from "@/lib/endatix-api/folders/types";
import type { Route } from "next";

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

export type FolderManagementDetailFailure =
  | { kind: "not_found" }
  | { kind: "auth" }
  | { kind: "api"; message: string };

export type FolderManagementDetailResult =
  | { ok: true; data: FolderManagementDetailSuccess }
  | { ok: false; error: FolderManagementDetailFailure };
