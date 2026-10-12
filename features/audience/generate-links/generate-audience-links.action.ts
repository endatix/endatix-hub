"use server";

import { Permissions } from "@/features/auth/authorization";
import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudiencePaging,
  type AudiencePerson,
  type IssuedAudienceLink,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";
import type { PersonalLink } from "./personal-links";

const LINKS_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to create personalised links.",
  logMessage: "Failed to create personalised links.",
  loggerName: "audience.links",
} as const;

/** Each issued token with its person's identifier; `""` for someone added after the read. */
function withIdentifiers(
  issued: IssuedAudienceLink[],
  people: readonly AudiencePerson[],
): PersonalLink[] {
  const identifiers = new Map(
    people.map((person) => [person.membershipId, person.identifier]),
  );
  return issued.map((link) => ({
    identifier: identifiers.get(link.membershipId) ?? "",
    token: link.token,
  }));
}

/**
 * People first, then the links: a token exists only in this response (the API keeps a hash), so
 * the identifiers must already be in hand when it arrives, or the file could not say whose it is.
 */
async function issueLinks(
  api: EndatixApi,
  formId: string,
): Promise<ApiResult<PersonalLink[]>> {
  const people = await api.audience.listPeople(formId, {
    page: 1,
    pageSize: AudiencePaging.MaxPageSize,
  });
  if (!people.success) return people;
  const issued = await api.audience.generateLinks(formId);
  if (!issued.success) return issued;
  return ApiResult.success(withIdentifiers(issued.data, people.data.items));
}

/** A link for everyone on the form who has none yet, each with their identifier. */
export async function generateAudienceLinksAction(
  formId: string,
): Promise<Result<PersonalLink[]>> {
  return withHubAudienceApi((api) => issueLinks(api, formId), {
    ...LINKS_LOG,
    formId,
  });
}
