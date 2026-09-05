import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  type LucideIcon,
} from "lucide-react";
import {
  FILE_KINDS,
  type FileKindGroupKey,
  type FileKindKey,
} from "./file-kinds";

export const FILE_GROUP_ICONS = {
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  document: FileType,
  data: FileText,
  archive: FileArchive,
} as const satisfies Record<FileKindGroupKey, LucideIcon>;

const FILE_KIND_ICON_OVERRIDES: Partial<Record<FileKindKey, LucideIcon>> = {
  csv: FileText,
  json: FileJson,
  xlsx: FileSpreadsheet,
  xml: FileCode,
  txt: File,
};

export function getFileKindIcon(key: FileKindKey): LucideIcon {
  return (
    FILE_KIND_ICON_OVERRIDES[key] ?? FILE_GROUP_ICONS[FILE_KINDS[key].group]
  );
}
