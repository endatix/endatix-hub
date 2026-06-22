import { safeDecodeURIComponent } from "@/features/folders/lib/folder-slug-matching";

export type FormsHeaderRouteContext = {
  section: "forms" | "templates";
  currentFolderSlug: string | null;
};

/**
 * Derives folder breadcrumb context from @header forms catch-all segments.
 *
 * Folder slugs are only resolved when a `folders` segment is present, e.g.
 * `['folders', 'folder-exports']` for `/forms/folders/folder-exports`.
 */
export function resolveFormsHeaderRouteContext(
  catchAll: string[] | undefined,
): FormsHeaderRouteContext {
  const segments = (catchAll ?? [])
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return {
      section: segments[0] === "templates" ? "templates" : "forms",
      currentFolderSlug: null,
    };
  }

  const templatesIndex = segments.indexOf("templates");
  if (templatesIndex >= 0) {
    const foldersIndex = segments.indexOf("folders", templatesIndex + 1);
    if (foldersIndex >= 0) {
      return resolveFolderSlugFromSegments(segments, foldersIndex, "templates");
    }
  }

  const foldersIndex = segments.indexOf("folders");
  if (foldersIndex >= 0) {
    return resolveFolderSlugFromSegments(segments, foldersIndex, "forms");
  }

  return { section: "forms", currentFolderSlug: null };
}

function resolveFolderSlugFromSegments(
  segments: string[],
  foldersIndex: number,
  section: "forms" | "templates",
): FormsHeaderRouteContext {
  const slug = segments[foldersIndex + 1]?.trim();
  if (!slug || slug === "folders") {
    return { section, currentFolderSlug: null };
  }

  return {
    section,
    currentFolderSlug: safeDecodeURIComponent(slug),
  };
}
