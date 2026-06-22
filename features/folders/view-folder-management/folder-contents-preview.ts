import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import type { Form, FormTemplate } from "@/types";

export const FOLDER_CONTENTS_PREVIEW_LIMIT = 100;

export type FolderContentsPreview = {
  limit: number;
  shownItemCount: number;
  isTruncated: boolean;
};

export function buildFolderContentsPreview(
  formsPage: PagedResponse<Form>,
  templates: readonly FormTemplate[],
  limit = FOLDER_CONTENTS_PREVIEW_LIMIT,
): FolderContentsPreview {
  const formsTotalRecords = formsPage.totalRecords ?? formsPage.items.length;
  const isFormsTruncated = formsTotalRecords > limit;
  const isTemplatesTruncated = templates.length >= limit;
  const shownItemCount = formsPage.items.length + templates.length;

  return {
    limit,
    shownItemCount,
    isTruncated: isFormsTruncated || isTemplatesTruncated,
  };
}

export function formatFolderContentsPreviewLabel(
  preview: FolderContentsPreview,
): string {
  if (!preview.isTruncated) {
    return `Showing all ${preview.shownItemCount} items`;
  }

  return `Showing top ${preview.shownItemCount} items`;
}
