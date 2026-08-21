import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  GetPublicFormAccessRequest,
  PublicFormAccessResponse,
} from "@/lib/endatix-api/forms/types";
import { toResult, type ResultType } from "@/lib/result";

export interface GetPublicFormAccessQuery {
  formId: string;
  token?: string;
  tokenType?: GetPublicFormAccessRequest["tokenType"];
}

/**
 * Resolves public-form access data (ReBAC authorization) via Endatix API's PublicFormAccessPolicy.
 * Pass token + tokenType for submission/access-token flows; Hub session is used when present.
 */
export async function getPublicFormAccessUseCase({
  formId,
  token,
  tokenType,
}: GetPublicFormAccessQuery): Promise<ResultType<PublicFormAccessResponse>> {
  const session = await auth();
  const endatixApi = new EndatixApi(session?.accessToken);
  const resolvedTokenType = tokenType ?? (token ? "AccessToken" : undefined);
  const accessRequest: GetPublicFormAccessRequest =
    token && resolvedTokenType ? { token, tokenType: resolvedTokenType } : {};

  const getAccessApiResult = await endatixApi.forms.getPublicFormAccess(
    formId,
    accessRequest,
    false,
  );

  return toResult(getAccessApiResult, {
    fallbackMessage: "Failed to load form access.",
    logMessage: "Failed to load public form access.",
    loggerName: "public-form.access",
  });
}
