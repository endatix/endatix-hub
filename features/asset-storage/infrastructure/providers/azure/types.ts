export interface FileOptions {
  fileName: string;
  containerName: string;
  folderPath?: string;
}

export interface FolderOptions {
  containerName: string;
  formId: string;
  submissionId: string;
}

export interface BlobPropertiesResult {
  sizeInBytes: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface BulkReadUrlsOptions extends Omit<FileOptions, "fileName"> {
  resourceType: "file" | "directory" | "container";
  resourceNames?: string[];
  expiresInMinutes?: number;
}
