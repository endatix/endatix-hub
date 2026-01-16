import { File } from "@/lib/questions/file/file-type";
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
export interface ProtectedFile extends File {
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
