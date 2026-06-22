import { describe, expect, it } from "vitest";
import {
  buildFolderContentsPreview,
  formatFolderContentsPreviewLabel,
  FOLDER_CONTENTS_PREVIEW_LIMIT,
} from "../folder-contents-preview";

describe("buildFolderContentsPreview", () => {
  it("marks preview as complete when totals are below the limit", () => {
    const preview = buildFolderContentsPreview(
      {
        page: 1,
        pageSize: FOLDER_CONTENTS_PREVIEW_LIMIT,
        totalRecords: 12,
        totalPages: 1,
        items: [{ id: "1" } as never, { id: "2" } as never],
      },
      [{ id: "template-1" } as never],
    );

    expect(preview).toEqual({
      limit: 100,
      shownItemCount: 3,
      isTruncated: false,
    });
    expect(formatFolderContentsPreviewLabel(preview)).toBe(
      "Showing all 3 items",
    );
  });

  it("marks preview as truncated when forms total exceeds the limit", () => {
    const preview = buildFolderContentsPreview(
      {
        page: 1,
        pageSize: FOLDER_CONTENTS_PREVIEW_LIMIT,
        totalRecords: 150,
        totalPages: 2,
        items: Array.from({ length: 100 }, (_, index) => ({
          id: `form-${index}`,
        })) as never[],
      },
      [],
    );

    expect(preview.isTruncated).toBe(true);
    expect(formatFolderContentsPreviewLabel(preview)).toBe(
      "Showing top 100 items",
    );
  });

  it("marks preview as truncated when templates hit the preview cap", () => {
    const preview = buildFolderContentsPreview(
      {
        page: 1,
        pageSize: FOLDER_CONTENTS_PREVIEW_LIMIT,
        totalRecords: 1,
        totalPages: 1,
        items: [{ id: "form-1" } as never],
      },
      Array.from({ length: 100 }, (_, index) => ({
        id: `template-${index}`,
      })) as never[],
    );

    expect(preview.isTruncated).toBe(true);
    expect(formatFolderContentsPreviewLabel(preview)).toBe(
      "Showing top 101 items",
    );
  });
});
