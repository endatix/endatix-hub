import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
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
};

function unwrapPart<T>(apiResult: ApiResult<T>, label: string): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: `Failed to load audience ${label}.`,
    logMessage: `Failed to load audience ${label}.`,
    loggerName: `audience.${label}`,
  } as MapApiResultToResultOptions<T>);
}

async function fetchAudienceParts(formId: string, paging: PeoplePaging) {
  const api = new EndatixApi((await auth())?.accessToken);
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

async function loadAudienceParts(
  formId: string,
  paging: PeoplePaging,
): Promise<Result<LoadedParts>> {
  const [settingsApi, propertiesApi, peopleApi] = await fetchAudienceParts(
    formId,
    paging,
  );
  const settings = unwrapPart(settingsApi, "settings");
  if (Result.isError(settings)) return settings;
  const properties = unwrapPart(propertiesApi, "properties");
  if (Result.isError(properties)) return properties;
  const people = unwrapPart(peopleApi, "people");
  if (Result.isError(people)) return people;

  return Result.success({
    settings: settings.value,
    properties: properties.value,
    people: people.value,
  });
}

/** Paging comes back from the API: it clamps a page past the end to the last page. */
export async function loadAudiencePage(
  formId: string,
  paging: PeoplePaging,
): Promise<Result<AudiencePageData>> {
  const { requireHubAccess, checkPermission } = await authorization();
  await requireHubAccess();

  const [parts, matchKeyPermission] = await Promise.all([
    loadAudienceParts(formId, paging),
    checkPermission(Permissions.Tenant.ManageSettings),
  ]);
  if (Result.isError(parts)) return parts;

  return Result.success({
    settings: parts.value.settings,
    canManageMatchKey: matchKeyPermission.success,
    properties: parts.value.properties,
    people: [...parts.value.people.items],
    totalPeople: parts.value.people.totalRecords,
    page: parts.value.people.page,
    pageSize: parts.value.people.pageSize,
  });
}

export async function loadFormForAudience(
  formId: string,
): Promise<Result<Form>> {
  const session = await auth();
  return toResult(
    await new EndatixApi(session?.accessToken).forms.get(formId),
    {
      fallbackMessage: "Failed to load form.",
      logMessage: "Failed to load form for audience.",
      loggerName: "audience.page",
    },
  );
}
