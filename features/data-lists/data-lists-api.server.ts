import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, type ResultType } from "@/lib/result";

export async function requireDataListsApi(): Promise<EndatixApi> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();
  return new EndatixApi(session?.accessToken);
}

export const DATA_LISTS_ACCESS_DENIED_MESSAGE =
  "You no longer have access to data lists.";

/**
 * `requireDataListsApi` for a background read: a lost session or a missing
 * grant is a `Result` error, never a redirect, so the page the read runs
 * under (the form designer) keeps its unsaved work.
 */
export async function checkDataListsApi(): Promise<ResultType<EndatixApi>> {
  const session = await auth();
  const { checkPermission } = await authorization(session);
  const allowed = await checkPermission(Permissions.Access.Hub);
  if (!allowed.success) {
    return Result.error(DATA_LISTS_ACCESS_DENIED_MESSAGE);
  }
  return Result.success(new EndatixApi(session?.accessToken));
}
