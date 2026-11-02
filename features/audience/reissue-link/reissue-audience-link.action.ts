"use server";

import { Permissions } from "@/features/auth/authorization";
import type { IssuedAudienceLink } from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { Result } from "@/lib/result";
import { isMissingRoute } from "../shared/missing-route";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const REISSUE_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to reissue the link.",
  logMessage: "Failed to reissue the link.",
  loggerName: "audience.links.reissue",
} as const;

const NEEDS_NEWER_API = "Reissuing links needs a newer Endatix API.";

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
