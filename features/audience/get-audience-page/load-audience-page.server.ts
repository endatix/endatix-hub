import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import {
  type AudiencePerson,
  type AudienceProperty,
  type AudienceSettings,
} from "@/lib/endatix-api/audience/types";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import type { Form } from "@/types";
import type { PeoplePaging } from "./parse-people-page";

export type AudiencePageData = {
  settings: AudienceSettings;
  canManageMatchKey: boolean;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
  page: number;
  pageSize: number;
  /** From the API, so the footer and the server agree on paging. */
  totalPages: number;
  hasNextPage: boolean;
};

function unwrapPart<T>(apiResult: ApiResult<T>, label: string): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: `Failed to load audience ${label}.`,
    logMessage: `Failed to load audience ${label}.`,
    loggerName: `audience.${label}`,
  } as MapApiResultToResultOptions<T>);
}

function fetchAudienceParts(
  api: EndatixApi,
  formId: string,
  paging: PeoplePaging,
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
  paging: PeoplePaging,
): Promise<Result<LoadedParts>> {
  const [settingsApi, propertiesApi, peopleApi] = await fetchAudienceParts(
    api,
    formId,
    paging,
  );
  return combineParts(
    unwrapPart(settingsApi, "settings"),
    unwrapPart(propertiesApi, "properties"),
    unwrapPart(peopleApi, "people"),
  );
}

function toPageData(
  parts: LoadedParts,
  canManageMatchKey: boolean,
): AudiencePageData {
  return {
    settings: parts.settings,
    canManageMatchKey,
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
export type AudiencePageRequest = {
  api: EndatixApi;
  formId: string;
  paging: PeoplePaging;
  canManageMatchKey: boolean;
};

export async function loadAudiencePage(
  request: AudiencePageRequest,
): Promise<Result<AudiencePageData>> {
  const { api, formId, paging, canManageMatchKey } = request;
  const parts = await loadAudienceParts(api, formId, paging);
  if (Result.isError(parts)) return parts;
  return Result.success(toPageData(parts.value, canManageMatchKey));
}

export async function loadFormForAudience(
  api: EndatixApi,
  formId: string,
): Promise<Result<Form>> {
  return toResult(await api.forms.get(formId), {
    fallbackMessage: "Failed to load form.",
    logMessage: "Failed to load form for audience.",
    loggerName: "audience.page",
  });
}
