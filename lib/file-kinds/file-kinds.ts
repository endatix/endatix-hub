export const FILE_KIND_GROUPS = {
  image: { key: "image", label: "Image files" },
  audio: { key: "audio", label: "Audio files" },
  video: { key: "video", label: "Video files" },
  document: { key: "document", label: "Documents" },
  data: { key: "data", label: "Data files" },
  archive: { key: "archive", label: "Archives" },
} as const;

export type FileKindGroupKey = keyof typeof FILE_KIND_GROUPS;

export interface FileKindDefinition {
  key: string;
  extension: string;
  mimeType: string;
  label: string;
  group: FileKindGroupKey;
}

function kind<K extends string>(
  key: K,
  mimeType: string,
  label: string,
  group: FileKindGroupKey,
): FileKindDefinition & { key: K; extension: K } {
  return { key, extension: key, mimeType, label, group };
}

export const FILE_KINDS = {
  csv: kind("csv", "text/csv", "CSV", "data"),
  xlsx: kind(
    "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Excel",
    "data",
  ),
  json: kind("json", "application/json", "JSON", "data"),
  xml: kind("xml", "application/xml", "XML", "data"),
  pdf: kind("pdf", "application/pdf", "PDF", "document"),
  txt: kind("txt", "text/plain", "Text", "document"),
  zip: kind("zip", "application/zip", "ZIP", "archive"),
  jpg: kind("jpg", "image/jpeg", "JPEG", "image"),
  jpeg: kind("jpeg", "image/jpeg", "JPEG", "image"),
  png: kind("png", "image/png", "PNG", "image"),
  gif: kind("gif", "image/gif", "GIF", "image"),
  webp: kind("webp", "image/webp", "WebP", "image"),
  svg: kind("svg", "image/svg+xml", "SVG", "image"),
  bmp: kind("bmp", "image/bmp", "BMP", "image"),
  ico: kind("ico", "image/vnd.microsoft.icon", "ICO", "image"),
  avif: kind("avif", "image/avif", "AVIF", "image"),
  mp3: kind("mp3", "audio/mpeg", "MP3", "audio"),
  wav: kind("wav", "audio/wav", "WAV", "audio"),
  ogg: kind("ogg", "audio/ogg", "OGG", "audio"),
  m4a: kind("m4a", "audio/mp4", "M4A", "audio"),
  aac: kind("aac", "audio/aac", "AAC", "audio"),
  flac: kind("flac", "audio/flac", "FLAC", "audio"),
  mp4: kind("mp4", "video/mp4", "MP4", "video"),
  webm: kind("webm", "video/webm", "WebM", "video"),
  mov: kind("mov", "video/quicktime", "MOV", "video"),
  avi: kind("avi", "video/x-msvideo", "AVI", "video"),
  mkv: kind("mkv", "video/x-matroska", "MKV", "video"),
  m4v: kind("m4v", "video/x-m4v", "M4V", "video"),
} as const satisfies Record<string, FileKindDefinition>;

export type FileKindKey = keyof typeof FILE_KINDS;

export function isFileKindKey(value: string): value is FileKindKey {
  return Object.hasOwn(FILE_KINDS, value);
}

export function isFileKindGroupKey(value: string): value is FileKindGroupKey {
  return Object.hasOwn(FILE_KIND_GROUPS, value);
}

export function getFileKindKeysInGroup(group: FileKindGroupKey): FileKindKey[] {
  return (Object.keys(FILE_KINDS) as FileKindKey[]).filter(
    (key) => FILE_KINDS[key].group === group,
  );
}

/** Strip a leading dot and lowercase; undefined when the extension is unknown. */
export function fileKindFromExtension(
  extension: string,
): FileKindKey | undefined {
  const key = extension.trim().replace(/^\./, "").toLowerCase();
  if (!isFileKindKey(key)) {
    return undefined;
  }

  return key;
}
