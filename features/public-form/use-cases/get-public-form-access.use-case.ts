import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  GetPublicFormAccessRequest,
  PublicFormAccessResponse,
} from "@/lib/endatix-api/forms/types";
import { Result } from "@/lib/result";

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
}: GetPublicFormAccessQuery): Promise<Result<PublicFormAccessResponse>> {
  const session = await auth();
  const endatixApi = new EndatixApi(session?.accessToken);
  const resolvedTokenType = tokenType ?? (token ? "AccessToken" : undefined);
  const accessRequest: GetPublicFormAccessRequest =
    token && resolvedTokenType ? { token, tokenType: resolvedTokenType } : {};

  const accessResult = await endatixApi.forms.getPublicFormAccess(
    formId,
    accessRequest,
    false,
  );

  if (ApiResult.isError(accessResult)) {
    return Result.error(accessResult.error.message);
  }

  return Result.success(accessResult.data);
}
