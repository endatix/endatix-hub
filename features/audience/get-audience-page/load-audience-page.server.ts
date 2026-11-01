import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import {
  AudiencePeopleTestFilter,
  type AudiencePerson,
  type AudienceProperty,
  type AudienceSettings,
} from "@/lib/endatix-api/audience/types";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import type { PeopleQuery } from "./parse-people-page";

export type AudiencePageData = {
  settings: AudienceSettings;
  canManageMatchKey: boolean;
  /** Whether this reader may add, change or remove people and properties (`forms.edit`). */
  canEdit: boolean;
  /** Whether this reader may open a test submission as a person (`forms.test`). */
  canTest: boolean;
  /** Whether this reader may copy a test link for a test person (`canCopyTestLink`). */
  canCopyTestLink: boolean;
  /** Whether the test links route answers this reader (`testLinkAccess`). */
  canMintTestLinks: boolean;
  /** The form's Test participants, counted only with `canMintTestLinks`; else 0. */
  testParticipants: number;
  /** The All / Real / Test filter the list was read with; `totalPeople` counts that set. */
  testFilter: AudiencePeopleTestFilter;
  /** The identifier search (`?search=`) the list was read with; `totalPeople` counts what it keeps. */
  search: string;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
  page: number;
  pageSize: number;
  /** From the API, so the footer and the server agree on paging. */
  totalPages: number;
  hasNextPage: boolean;
};

function unwrapPart<T>(
  apiResult: ApiResult<T>,
  label: string,
  message: string,
): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: message,
    logMessage: message,
    loggerName: `audience.${label}`,
  } as MapApiResultToResultOptions<T>);
}

function fetchAudienceParts(
  api: EndatixApi,
  formId: string,
  paging: PeopleQuery,
) {
  return Promise.all([
    api.audience.getSettings(),
    api.audience.listProperties(formId),
    api.audience.listPeople(formId, paging),
  ]);
}

type LoadedParts = {
  settings: AudienceSettings;
  properties: AudienceProperty[];
  people: AudiencePeoplePage;
};

function combineParts(
  settings: Result<AudienceSettings>,
  properties: Result<AudienceProperty[]>,
  people: Result<AudiencePeoplePage>,
): Result<LoadedParts> {
  if (Result.isError(settings)) return settings;
  if (Result.isError(properties)) return properties;
  if (Result.isError(people)) return people;

  return Result.success({
    settings: settings.value,
    properties: properties.value,
    people: people.value,
  });
}

async function loadAudienceParts(
  api: EndatixApi,
  formId: string,
  paging: PeopleQuery,
): Promise<Result<LoadedParts>> {
  const [settingsApi, propertiesApi, peopleApi] = await fetchAudienceParts(
    api,
    formId,
    paging,
  );
  return combineParts(
    unwrapPart(settingsApi, "settings", "Failed to load the match key."),
    unwrapPart(propertiesApi, "properties", "Failed to load the properties."),
    unwrapPart(peopleApi, "people", "Failed to load the participants."),
  );
}

type Capabilities = Pick<
  AudiencePageData,
  | "canManageMatchKey"
  | "canEdit"
  | "canTest"
  | "canCopyTestLink"
  | "canMintTestLinks"
>;

/** One row of the Test filter, for its total; a failed read offers no download (0). */
async function countTestParticipants(
  api: EndatixApi,
  formId: string,
): Promise<number> {
  const tests = await api.audience.listPeople(formId, {
    page: 1,
    pageSize: 1,
    test: AudiencePeopleTestFilter.Test,
  });
  return tests.success ? tests.data.totalRecords : 0;
}

type PageFacts = PeopleQuery & { testParticipants: number };

function toPageData(
  parts: LoadedParts,
  capabilities: Capabilities,
  { test, search, testParticipants }: PageFacts,
): AudiencePageData {
  return {
    settings: parts.settings,
    ...capabilities,
    testParticipants,
    testFilter: test,
    search,
    properties: parts.properties,
    people: [...parts.people.items],
    totalPeople: parts.people.totalRecords,
    page: parts.people.page,
    pageSize: parts.people.pageSize,
    totalPages: parts.people.totalPages,
    hasNextPage: parts.people.hasNextPage,
  };
}

/**
 * The audience tab's data. The page has already checked Hub access and the flag once and passes
 * its client; paging comes back from the API, which clamps a page past the end to the last page.
 */
export type AudiencePageRequest = Capabilities & {
  api: EndatixApi;
  formId: string;
  paging: PeopleQuery;
};

export async function loadAudiencePage(
  request: AudiencePageRequest,
): Promise<Result<AudiencePageData>> {
  const { api, formId, paging, ...capabilities } = request;
  const { canMintTestLinks } = capabilities;
  // A list filtered to Test, and not searched, counts them itself.
  const listCounts =
    paging.test === AudiencePeopleTestFilter.Test && !paging.search;
  const [parts, counted] = await Promise.all([
    loadAudienceParts(api, formId, paging),
    canMintTestLinks && !listCounts ? countTestParticipants(api, formId) : 0,
  ]);
  if (Result.isError(parts)) return parts;
  const ownTotal = canMintTestLinks && listCounts;
  const testParticipants = ownTotal ? parts.value.people.totalRecords : counted;
  const facts = { ...paging, testParticipants };
  return Result.success(toPageData(parts.value, capabilities, facts));
}
