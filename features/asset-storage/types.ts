import { IFile } from "@/lib/questions/file/file-type";
import { Result } from "@/lib/result";
import { SurveyModel } from "survey-react-ui";

export type ContainerType = "USER_FILES" | "CONTENT";

/* ──────────────────────────────────────────────────────────────────────────────
 * Types for content tokens generation operations
 * ────────────────────────────────────────────────────────────────────────────── */

export type ContentItemType = "form" | "template";

export interface ContentTokenRequest {
  itemId: string;
  itemType: ContentItemType;
  fileNames: string[];
  questionName?: string;
}

export interface TokenOperationResult {
  success: boolean;
  message?: string;
  url?: string;
}

export interface ContentUploadMetadata {
  userId: string;
  itemId: string;
  contentItemType: string;
  questionName: string;
}

export interface ContentTokenResponse {
  tokens: Record<string, TokenOperationResult>;
  uploadMetadata: ContentUploadMetadata;
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Types for read token operations
 * ────────────────────────────────────────────────────────────────────────────── */

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

// ─── Storage file metadata  ───────────────
export type ProcessedState = "original" | "optimized";

export interface FileMetadataBase {
  displayName: string;
  contentType: string;
  sizeInBytes?: number;
  originalFileName?: string;
  uploadedBy: string;
  questionName?: string;
  fileState?: ProcessedState;
}

/* User (submission uploaded) file metadata. */
export interface UserFileMetadata extends FileMetadataBase {
  readonly kind: "user";
  formId?: string;
  submissionId?: string;
  formLang?: string;
}

/* Content (creator uploaded) file metadata. */
export interface ContentFileMetadata extends FileMetadataBase {
  readonly kind: "content";
  itemId: string;
  contentItemType: ContentItemType;
}

/** Exported discriminated union type for file metadata. */
export type FileMetadata = UserFileMetadata | ContentFileMetadata;

/** Context for user file request headers. */
export type UserFileRequestContext = Pick<
  UserFileMetadata,
  "formId" | "submissionId" | "questionName" | "formLang"
>;

/** Metadata + blobHTTPHeaders for BlockBlobClient.uploadData. */
export interface BlobUploadOptions {
  metadata: Record<string, string>;
  blobHTTPHeaders: Record<string, string>;
}
