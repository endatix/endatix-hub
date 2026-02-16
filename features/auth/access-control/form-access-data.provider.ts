import { Session } from "next-auth";
import { revalidateTag, unstable_cache } from "next/cache";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { FormAccessData } from "./types";

const FORM_ACCESS_CACHE_TAG = "form_access";
const FORM_ACCESS_CACHE_TTL = 300; // 5 minutes (Short TTL for security)

const getFormAccessCacheKey = (
  formId: string,
  submissionId?: string,
  token?: string,
) =>
  `${FORM_ACCESS_CACHE_TAG}:${formId}:${submissionId ?? "new"}:${token ? "with-token" : "no-token"}`;

async function fetchFormAccessData(
  formId: string,
  submissionId: string | undefined,
  accessToken: string,
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
    return { formPermissions: [], submissionPermissions: [] };
  } catch (error) {
    console.error("Error getting form access:", error);
    return { formPermissions: [], submissionPermissions: [] };
  }
}

export function getFormAccessDataForContext(session: Session | null) {
  return async (
    formId: string,
    submissionId?: string,
    token?: string,
  ): Promise<FormAccessData> => {
    if (!session?.accessToken) {
      return { formPermissions: [], submissionPermissions: [] };
    }

    const cacheKey = getFormAccessCacheKey(formId, submissionId, token);

    return unstable_cache(
      () =>
        fetchFormAccessData(formId, submissionId, session.accessToken!, token),
      [formId, submissionId ?? "new", session.accessToken, token ?? "no-token"],
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
