export function normalizeFolderSlug(slug: string): string {
  return decodeURIComponent(slug).trim().toLowerCase();
}

export function folderSlugsMatch(left: string, right: string): boolean {
  return normalizeFolderSlug(left) === normalizeFolderSlug(right);
}
