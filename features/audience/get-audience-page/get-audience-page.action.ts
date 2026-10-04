"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import {
  AudiencePaging,
  type AudiencePerson,
  type AudienceProperty,
  type AudienceSettings,
} from "@/lib/endatix-api/audience/types";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";

export type AudiencePageData = {
  settings: AudienceSettings;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
};

export type GetAudiencePageResult = Result<AudiencePageData>;

const FIRST_PAGE = 1;

function unwrapPart<T>(apiResult: ApiResult<T>, label: string): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: `Failed to load audience ${label}.`,
    logMessage: `Failed to load audience ${label}.`,
    loggerName: `audience.${label}`,
  } as MapApiResultToResultOptions<T>);
}

async function fetchAudienceParts(formId: string) {
  const api = new EndatixApi((await auth())?.accessToken);
  return Promise.all([
    api.audience.getSettings(),
    api.audience.listProperties(formId),
    api.audience.listPeople(formId, {
      page: FIRST_PAGE,
      pageSize: AudiencePaging.MaxPageSize,
    }),
  ]);
}

function toPageData(
  settings: AudienceSettings,
  properties: AudienceProperty[],
  people: AudiencePeoplePage,
): AudiencePageData {
  return {
    settings,
    properties,
    people: [...people.items],
    totalPeople: people.totalRecords,
  };
}

export async function getAudiencePageAction(
  formId: string,
): Promise<GetAudiencePageResult> {
  const { requireHubAccess } = await authorization();
  await requireHubAccess();

  const [settingsApi, propertiesApi, peopleApi] =
    await fetchAudienceParts(formId);
  const settings = unwrapPart(settingsApi, "settings");
  if (Result.isError(settings)) return settings;
  const properties = unwrapPart(propertiesApi, "properties");
  if (Result.isError(properties)) return properties;
  const people = unwrapPart(peopleApi, "people");
  if (Result.isError(people)) return people;

  return Result.success(
    toPageData(settings.value, properties.value, people.value),
  );
}
