"use server";

import { Permissions } from "@/features/auth/authorization";
import {
  MAX_AUDIENCE_SEARCH_LENGTH,
  type AudienceLinksPreview,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";
import { issueLinks, previewLinks } from "./issue-links.server";
import type { PersonalLink } from "./personal-links";

const LINKS_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to create personalized links.",
  logMessage: "Failed to create personalized links.",
  loggerName: "audience.links",
} as const;

const PREVIEW_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to count who gets a link.",
  logMessage: "Failed to count who gets a link.",
  loggerName: "audience.links.preview",
} as const;

const SEARCH_TOO_LONG = `Search for at most ${MAX_AUDIENCE_SEARCH_LENGTH} characters.`;

const tooLong = (search: string) =>
  search.trim().length > MAX_AUDIENCE_SEARCH_LENGTH;

/** A link for everyone the search keeps who has none yet, each with their identifier. */
export async function generateAudienceLinksAction(
  formId: string,
  search: string,
): Promise<Result<PersonalLink[]>> {
  if (tooLong(search)) return Result.validationError(SEARCH_TOO_LONG);
  return withHubAudienceApi((api) => issueLinks(api, formId, search), {
    ...LINKS_LOG,
    formId,
  });
}

/** Who the search keeps and who of them gets a link; `null` from an API before link batches. */
export async function previewAudienceLinksAction(
  formId: string,
  search: string,
): Promise<Result<AudienceLinksPreview | null>> {
  if (tooLong(search)) return Result.validationError(SEARCH_TOO_LONG);
  return withHubAudienceApi(
    (api) => previewLinks(api, formId, search),
    PREVIEW_LOG,
  );
}
