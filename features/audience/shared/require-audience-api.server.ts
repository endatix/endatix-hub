import "server-only";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { personalizationFlag } from "@/lib/feature-flags";
import { Result, type ResultType } from "@/lib/result";

export const PERSONALIZATION_DISABLED_MESSAGE =
  "Personalization is not enabled for this environment.";

/**
 * Checks Hub access and the `personalization` flag once, returning the API client for audience
 * reads and writes. Throws (redirects) on missing Hub access, like `requireHubAccess`.
 */
export async function requireAudienceApi(): Promise<ResultType<EndatixApi>> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  const [, isEnabled] = await Promise.all([
    requireHubAccess(),
    personalizationFlag(),
  ]);
  return isEnabled
    ? Result.success(new EndatixApi(session?.accessToken))
    : Result.error(PERSONALIZATION_DISABLED_MESSAGE);
}
