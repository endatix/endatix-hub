import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import {
  AudiencePaging,
  type AudienceLinksPreview,
  type AudiencePerson,
  type IssuedAudienceLink,
} from "@/lib/endatix-api/audience/types";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { isMissingRoute } from "../shared/missing-route";
import {
  FILTERED_LINKS_NEED_NEWER_API,
  type PersonalLink,
} from "./personal-links";

const NEEDS_NEWER_API = `${FILTERED_LINKS_NEED_NEWER_API}.`;

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

async function readIdentifiers(
  api: EndatixApi,
  formId: string,
): Promise<ApiResult<AudiencePerson[]>> {
  const people: AudiencePerson[] = [];
  let page = 1;
  let batch: ApiResult<AudiencePeoplePage>;
  do {
    batch = await api.audience.listPeople(formId, {
      page,
      pageSize: AudiencePaging.MaxPageSize,
    });
    if (!batch.success) return batch;
    people.push(...batch.data.items);
    page += 1;
  } while (batch.data.hasNextPage && batch.data.items.length > 0);
  return ApiResult.success(people);
}

/**
 * An API before link batches (endatix#1430): `POST links` for everyone, whose answer has no
 * identifiers, so the people are read first. A token exists only in that answer. Remove with
 * the older API's support.
 */
async function issueToEveryoneOnOlderApi(
  api: EndatixApi,
  formId: string,
): Promise<ApiResult<PersonalLink[]>> {
  const people = await readIdentifiers(api, formId);
  if (!people.success) return people;
  const issued = await api.audience.generateLinks(formId);
  if (!issued.success) return issued;
  return ApiResult.success(withIdentifiers(issued.data, people.data));
}

/** New links for the participants the search keeps, each with its identifier. */
export async function issueLinks(
  api: EndatixApi,
  formId: string,
  search: string,
): Promise<ApiResult<PersonalLink[]>> {
  const batch = await api.audience.issueLinkBatch(formId, search);
  if (batch.success) {
    return ApiResult.success(
      batch.data.issued.map(({ identifier, token }) => ({ identifier, token })),
    );
  }
  if (!isMissingRoute(batch)) return batch;
  if (search.trim()) {
    return ApiResult.notFoundError(NEEDS_NEWER_API, batch.error.details);
  }
  return issueToEveryoneOnOlderApi(api, formId);
}

/** The preview, or `null` from an API without the route (a bare 404). */
export async function previewLinks(
  api: EndatixApi,
  formId: string,
  search: string,
): Promise<ApiResult<AudienceLinksPreview | null>> {
  const preview = await api.audience.previewLinks(formId, search);
  if (preview.success || !isMissingRoute(preview)) return preview;
  return ApiResult.success(null);
}
