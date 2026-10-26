"use server";

import { Permissions } from "@/features/auth/authorization";
import type { IssuedAudienceLink } from "@/lib/endatix-api/audience/types";
import {
  ApiErrorType,
  ApiResult,
  type ApiError,
} from "@/lib/endatix-api/shared/api-result";
import type { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const REISSUE_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to reissue the link.",
  logMessage: "Failed to reissue the link.",
  loggerName: "audience.links.reissue",
} as const;

const NEEDS_NEWER_API = "Reissuing links needs a newer Endatix API.";

/**
 * A heuristic: the API answers its own 404s (no link yet, participant removed) as
 * `application/problem+json`, while an API without this route answers a bare 404.
 */
function isMissingRoute({ error }: ApiError) {
  return (
    error.type === ApiErrorType.NotFoundError &&
    error.details?.problemMediaType !== "application/problem+json"
  );
}

/** One participant's link with a new token; the old one stops opening it. */
export async function reissueAudienceLinkAction(
  formId: string,
  membershipId: string,
): Promise<Result<IssuedAudienceLink>> {
  return withHubAudienceApi(
    async (api) => {
      const reissued = await api.audience.reissueLink(formId, membershipId);
      if (reissued.success || !isMissingRoute(reissued)) return reissued;
      return ApiResult.notFoundError(NEEDS_NEWER_API, reissued.error.details);
    },
    { ...REISSUE_LOG, formId },
  );
}
