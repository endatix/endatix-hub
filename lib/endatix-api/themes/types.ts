import type { ApiEntity } from "../shared/types";

export type Theme = ApiEntity & {
  name: string;
  description?: string;
  jsonData: string;
  formsCount?: number;
};

export type ThemeListSortBy = "name" | "createdAt" | "modifiedAt";

export type CreateThemeRequest = {
  name: string;
  description?: string;
  jsonData?: string;
};

export type PartialUpdateThemeRequest = {
  name?: string;
  description?: string;
  jsonData?: string;
};
