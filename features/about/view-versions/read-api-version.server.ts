import "server-only";

import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { type BuildIdentity, nullIfBlank } from "@/lib/hosting/build-identity";

/** The API build from `GET /system/version`. Null when there is no session or the call fails. */
export async function readApiBuild(
  accessToken: string | undefined,
): Promise<BuildIdentity | null> {
  if (!accessToken) {
    return null;
  }

  const result = await new EndatixApi(accessToken).system.getVersion();
  if (ApiResult.isError(result)) {
    return null;
  }

  return {
    version: nullIfBlank(result.data.version),
    branch: nullIfBlank(result.data.branch),
    commit: nullIfBlank(result.data.commit),
  };
}
