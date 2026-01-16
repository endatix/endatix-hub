import { IFile } from "@/lib/questions/file/file-type";
import { SurveyModel } from "survey-react-ui";
import { Result } from "@/lib/result";

export type ContainerType = "USER_FILES" | "CONTENT";

export type ContentItemType = "form" | "template";

export interface IContainerInfo {
  containerType: ContainerType;
  containerName: string;
  hostName: string;
  isPrivate: boolean;
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

export type ReadTokensResult = Result<ContainerReadToken>;

export type UploadUserFilesCommand = {
  formId: string;
  submissionId?: string;
  files: { name: string; file: File }[];
};

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
