import type { Session } from "next-auth";
import { revalidateTag, unstable_cache } from "next/cache";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { FormAccessData } from "./types";

const FORM_ACCESS_CACHE_TAG = "form_access";
const FORM_ACCESS_CACHE_TTL = 300; // 5 minutes (Short TTL for security)

function emptyFormAccessData(
  formId: string,
  submissionId?: string,
): FormAccessData {
  return {
    formId,
    submissionId,
    formPermissions: [],
    submissionPermissions: [],
  };
}

const getFormAccessCacheKey = (
  formId: string,
  submissionId?: string,
  token?: string,
  userId?: string,
) =>
  `${FORM_ACCESS_CACHE_TAG}:${formId}:${submissionId ?? "new"}:${token ? "with-token" : "no-token"}:${userId ?? "anon"}`;

async function fetchFormAccessData(
  formId: string,
  submissionId: string | undefined,
  accessToken: string | undefined,
  token?: string,
): Promise<FormAccessData> {
  try {
    const endatixApi = new EndatixApi(accessToken);
    const result = await endatixApi.auth.getFormAccess(
      formId,
      submissionId,
      token,
    );

    if (ApiResult.isSuccess(result)) {
      return result.data;
    }

    console.error(
      "Error fetching form access:",
      ApiResult.getErrorMessage(result),
    );
    return emptyFormAccessData(formId, submissionId);
  } catch (error) {
    console.error("Error getting form access:", error);
    return emptyFormAccessData(formId, submissionId);
  }
}

export function getFormAccessDataForContext(session: Session | null) {
  return async (
    formId: string,
    submissionId?: string,
    token?: string,
  ): Promise<FormAccessData> => {
    const userId = session?.user?.id;
    const accessToken = session?.accessToken;
    const cacheKey = getFormAccessCacheKey(formId, submissionId, token, userId);

    return unstable_cache(
      () => fetchFormAccessData(formId, submissionId, accessToken, token),
      [formId, submissionId ?? "new", userId ?? "anon", token ?? "no-token"],
      {
        tags: [cacheKey, `${FORM_ACCESS_CACHE_TAG}:form-${formId}`],
        revalidate: FORM_ACCESS_CACHE_TTL,
      },
    )();
  };
}

export function invalidateFormAccessCache(formId: string) {
  revalidateTag(`${FORM_ACCESS_CACHE_TAG}:form-${formId}`, "max");
}
