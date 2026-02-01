/**
 * Represents a SurveyJS file with its content and metadata
 */
export interface IFile {
  content: string; // Base64 or URL content of the file
  name?: string; // Optional filename
  type?: string; // Optional MIME type
}

/**
 * Enumeration of supported file types for rendering
 */
export enum FileType {
  Image = "image", // Image files (jpg, png, etc)
  Video = "video", // Video files (mp4, etc)
  Audio = "audio", // Audio files (mp3, wav, etc)
  Document = "document", // PDF documents
  Unknown = "unknown", // Unsupported file types
}

/**
 * Determines the FileType based on the file's MIME type
 * @param file - The file object to analyze
 * @returns The detected FileType enum value
 */
export function getFileType(file: IFile): FileType {
  // Return unknown if file or required properties are missing
  if (!file || !file.content || !file.type) {
    return FileType.Unknown;
  }

  const mimeType = file.type.toLowerCase();

  const [mainMimeType, subMimeType] = mimeType.split("/");
  switch (mainMimeType) {
    case "image":
      return FileType.Image;
    case "video":
      return FileType.Video;
    case "audio":
      return FileType.Audio;
    case "application":
      if (subMimeType === "pdf") {
        return FileType.Document;
      }
      return FileType.Unknown;
    default:
      return FileType.Unknown;
  }
}
