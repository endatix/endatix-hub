import { IFile } from "@/lib/questions/file/file-type";
import { Result } from "@/lib/result";
import { SurveyModel } from "survey-react-ui";

export type ContainerType = "USER_FILES" | "CONTENT";

export type ContentItemType = "form" | "template";

export interface IContainerInfo {
  containerType: ContainerType;
  containerName: string;
  hostName: string;
  isPrivate: boolean;
  blobName: string;
}
export interface ProtectedFile extends IFile {
  token?: string;
}

export interface SurveyModelWithTokens extends SurveyModel {
  readTokens: {
    userFiles: IReadToken | null;
    content: IReadToken | null;
  };
}

export interface IReadToken {
  token: string | null;
  expiresOn: Date;
  generatedAt: Date;
}

export interface ContainerReadToken extends IReadToken {
  containerName: string;
}

export type ReadTokenResult = Result<ContainerReadToken>;

interface ReadTokensResponse {
  /**
   * A record of requested resource names and the corresponding tokens generated for read access
   */
  readTokens: Record<string, string>;
  /**
   * The date and time when the tokens will expire
   */
  expiresOn: Date;
  /**
   * The date and time when the tokens were generated
   */
  generatedAt: Date;
}

export type ReadTokensResult = Result<ReadTokensResponse>;

export type UploadUserFilesCommand = {
  formId: string;
  submissionId?: string;
  files: { name: string; file: File }[];
  additionalMetadata?: Record<string, string | null>;
};

/**
 * A map of storage tokens used for granular read access
 * @type {Record<string, string>}
 */
export type StorageTokenMap = Record<string, string>;

export type UploadFileResult = {
  name: string;
  url: string;
};

export type UploadUserFilesResult = Result<UploadFileResult[]>;

export type UploadContentFileCommand = {
  itemId: string;
  itemType: ContentItemType;
  file: File;
};

export type UploadContentFileResult = Result<UploadFileResult>;

// ─── Storage metadata ─────────────────────────────────────────
export type ProcessedState = "original" | "optimized";
export interface IOptimizable {
  fileState?: ProcessedState;
}

/** Files uploaded by users */
export interface UserFileMetadata extends IOptimizable {
  displayName: string;
  contentType: string;
  sizeInBytes: number;
  originalFileName?: string;
  questionName?: string;
}

/** Context for user file upload (form/submission/question). */
export interface UserFileContext {
  formId: string;
  submissionId?: string;
  questionId: string;
  formLang?: string;
}

/** Blob metadata shape for user file upload (written to Azure). */
export interface UserFileBlobMetadata extends IOptimizable {
  formId: string;
  submissionId: string;
  fileName: string;
  fileType: string;
  questionId: string;
  formLang?: string;
  fileContentDisposition?: string;
}

/** Props to build user file blob metadata. */
export interface UserFileMetadataProps extends UserFileContext {
  fileName: string;
  fileType?: string;
  fileContentDisposition?: string;
  fileState?: ProcessedState;
}

/** Props to build content file blob metadata. */
export interface ContentFileMetadataProps {
  userId: string;
  itemId: string;
  contentItemType: ContentItemType;
  fileName: string;
  fileType?: string;
  questionId?: string;
  fileState?: ProcessedState;
}

/** Blob metadata and HTTP headers for a content file upload. */
export interface ContentFileMetadata {
  metadata: Record<string, string>;
  blobHTTPHeaders: {
    blobContentType: string;
    blobContentDisposition?: string;
  };
}
