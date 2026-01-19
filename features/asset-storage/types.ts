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
