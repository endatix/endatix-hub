import { authoredImageFields, type Field } from "./authored-image-fields";
import { sourceSpans, type Span } from "./image-source-spans";

type Placement = { field: Field; span: Span; key: string };
export type EmbeddedFile = {
  key: string;
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  extension: string;
  location: string;
};
export interface ImageReview {
  files: EmbeddedFile[];
  eligible: Placement[];
  skipped: { location: string; reason: string }[];
}

function decode(source: string) {
  const match = /^data:image\/(png|jpeg|gif|webp);base64,/i.exec(source);
  if (!match) return "Unsupported image format or encoding.";
  try {
    const binary = atob(source.slice(match[0].length));
    if (!binary) return "Empty image.";
    const extension = match[1].toLowerCase();
    if (!hasImageSignature(binary, extension))
      return "Image bytes do not match the declared format.";
    const key = btoa(binary);
    return {
      extension,
      key,
      mime: `image/${extension}`,
      bytes: Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    };
  } catch {
    return "Invalid base64 image.";
  }
}

function hasImageSignature(binary: string, extension: string) {
  switch (extension) {
    case "png":
      return binary.startsWith("\x89PNG\r\n\x1a\n");
    case "jpeg":
      return binary.startsWith("\xff\xd8\xff");
    case "gif":
      return binary.startsWith("GIF87a") || binary.startsWith("GIF89a");
    case "webp":
      return binary.startsWith("RIFF") && binary.slice(8, 12) === "WEBP";
    default:
      return false;
  }
}

function collect(
  review: ImageReview,
  files: Map<string, EmbeddedFile>,
  field: Field,
) {
  for (const span of sourceSpans(field)) {
    const file = span.reason ?? decode(span.source);
    if (typeof file === "string") {
      review.skipped.push({ location: field.location, reason: file });
      continue;
    }
    if (!files.has(file.key))
      files.set(file.key, { ...file, location: field.location });
    review.eligible.push({ field, span, key: file.key });
  }
}

export function reviewEmbeddedImages(source: unknown): ImageReview {
  const files = new Map<string, EmbeddedFile>();
  const review: ImageReview = { files: [], eligible: [], skipped: [] };
  for (const field of authoredImageFields(source))
    collect(review, files, field);
  review.files = Array.from(files.values());
  return review;
}

function storedSource(url: string | undefined, kind: Field["kind"]) {
  if (!url || !/^https?:\/\//i.test(url) || /[?#\s]/.test(url))
    throw new Error("Expected an unsigned storage URL.");
  if (kind === "native") return url;
  return url
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("=", "&#61;")
    .replaceAll("`", "&#96;");
}

function replaceField(
  root: object,
  placements: Placement[],
  urls: ReadonlyMap<string, string>,
) {
  const { path, text } = placements[0].field;
  const owner = path
    .slice(0, -1)
    .reduce<
      Record<string, unknown>
    >((o, k) => o[k] as Record<string, unknown>, root as Record<string, unknown>);
  const last = path[path.length - 1];
  if (owner[last] !== text) throw new Error("The reviewed field changed.");
  let next = text;
  for (const { span, key, field } of placements.toReversed()) {
    const value = storedSource(urls.get(key), field.kind);
    next = next.slice(0, span.start) + value + next.slice(span.end);
  }
  owner[last] = next;
}

export function replaceEmbeddedImages(
  source: object,
  review: ImageReview,
  urls: ReadonlyMap<string, string>,
) {
  const result = structuredClone(source);
  for (const placements of placementsByField(review).values())
    replaceField(result, placements, urls);
  return result;
}

export function placementsByField(review: ImageReview) {
  const fields = new Map<Field, Placement[]>();
  for (const placement of review.eligible) {
    const group = fields.get(placement.field);
    if (group) group.push(placement);
    else fields.set(placement.field, [placement]);
  }
  return fields;
}
