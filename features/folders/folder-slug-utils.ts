import {
  isReservedUrlSlug,
  isValidUrlSlugFormat,
  normalizeUrlSlug,
  urlSlugFromDisplayName,
} from "@/lib/url/url-slug";

const INVALID_SLUG_MESSAGE =
  "Slug must use lowercase letters, numbers, and hyphens only; cannot start or end with a hyphen.";
const RESERVED_SLUG_MESSAGE = "This slug is reserved. Choose another.";

interface ResolveFolderSlugInput {
  name: string;
  slugInput: string;
  allowEmpty: boolean;
}

interface ResolveFolderSlugResult {
  value: string;
  error: string | null;
}

export function getFolderSlugPreview(name: string, slugInput: string): string {
  const trimmedSlug = slugInput.trim();
  if (trimmedSlug.length > 0) {
    return normalizeUrlSlug(trimmedSlug);
  }

  return urlSlugFromDisplayName(name.trim()) || "(derived from name)";
}

export function resolveFolderSlug({
  name,
  slugInput,
  allowEmpty,
}: ResolveFolderSlugInput): ResolveFolderSlugResult {
  const trimmedSlug = slugInput.trim();
  if (trimmedSlug.length === 0) {
    if (allowEmpty) {
      return { value: "", error: null };
    }

    return { value: urlSlugFromDisplayName(name.trim()), error: null };
  }

  const normalizedSlug = normalizeUrlSlug(trimmedSlug);
  if (!isValidUrlSlugFormat(normalizedSlug)) {
    return { value: "", error: INVALID_SLUG_MESSAGE };
  }

  if (isReservedUrlSlug(normalizedSlug)) {
    return { value: "", error: RESERVED_SLUG_MESSAGE };
  }

  return { value: normalizedSlug, error: null };
}
