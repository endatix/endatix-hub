import { PublicDataListTokenType } from "@/lib/endatix-public-api";
import { isAccessToken } from "@/lib/utils";

export interface DataListRuntimeContext {
  formId: string;
  token?: string;
  tokenType?: PublicDataListTokenType;
}

export function createDataListRuntimeContext(
  formId: string,
  token?: string,
): DataListRuntimeContext {
  if (!token) {
    return { formId };
  }

  return {
    formId,
    token,
    tokenType: isAccessToken(token) ? "AccessToken" : "SubmissionToken",
  };
}
