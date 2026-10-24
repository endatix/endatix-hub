import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import {
  AudiencePeopleTestFilter,
  type AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import {
  isNotFoundError,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import { valueProperties } from "../utils";

/** One page of each list: the rest are found by search. */
export const PREVIEW_LIST_SIZE = 50;

export type PreviewAsForm = {
  /** The saved definition the shared form serves. */
  definition: object;
  /** When it was last saved, ISO. */
  savedAt: string;
  /** The form's theme JSON, as the shared form applies it; none for the default. */
  theme?: string;
  /** The custom question JSON the shared form registers for this definition. */
  customQuestions: string[];
};

export type PreviewAsSelection =
  | {
      status: "found";
      person: AudiencePerson;
      /** Their values, typed as the respondent's `personalization`. */
      variables: Record<string, unknown>;
    }
  /** The participant the link names is no longer on the form. */
  | { status: "gone" };

export type PreviewAsData = {
  /** `null` before the form's first save, or when the saved JSON is unreadable. */
  form: PreviewAsForm | null;
  /** Whether the form has Properties; without them there is nothing to preview as. */
  hasVariables: boolean;
  testParticipants: AudiencePerson[];
  totalTest: number;
  search: string;
  /** Everyone matching `search`, real and test; `null` without a search. */
  matches: AudiencePerson[] | null;
  totalMatches: number;
  /** `null` when nobody is listed to preview as. */
  selected: PreviewAsSelection | null;
  identifierKind: AudienceIdentifierKind;
  /** Value properties only, for Edit values. */
  properties: AudienceProperty[];
  canTest: boolean;
};

export type PreviewAsRequest = {
  api: EndatixApi;
  formId: string;
  /** From the form the page already read; none before the first save. */
  activeDefinitionId?: string;
  memberId?: string;
  search?: string;
  canTest: boolean;
};

function unwrap<T>(apiResult: ApiResult<T>, label: string): Result<T> {
  return toResult(apiResult, {
    fallbackMessage: `Failed to load the preview's ${label}.`,
    logMessage: `Failed to load the preview's ${label}.`,
    loggerName: `audience.preview-as.${label}`,
  } as MapApiResultToResultOptions<T>);
}

function parseDefinition(jsonData: string): object | null {
  try {
    return JSON.parse(jsonData) as object;
  } catch {
    return null;
  }
}

async function loadForm({
  api,
  formId,
  activeDefinitionId,
}: PreviewAsRequest): Promise<Result<PreviewAsForm | null>> {
  if (!activeDefinitionId) return Result.success(null);
  const saved = unwrap(
    await api.definitions.get(formId, activeDefinitionId),
    "form",
  );
  if (Result.isError(saved)) return saved;
  const { jsonData, modifiedAt, createdAt, themeModel, customQuestions } =
    saved.value;
  const definition = parseDefinition(jsonData);
  if (!definition) return Result.success(null);
  return Result.success({
    definition,
    savedAt: new Date(modifiedAt ?? createdAt).toISOString(),
    theme: themeModel,
    customQuestions: customQuestions ?? [],
  });
}

const listPage = { page: 1, pageSize: PREVIEW_LIST_SIZE };

function fetchLists({ api, formId, search }: PreviewAsRequest) {
  const query = search?.trim();
  return Promise.all([
    api.audience.listPeople(formId, {
      test: AudiencePeopleTestFilter.Test,
      ...listPage,
    }),
    query
      ? api.audience.listPeople(formId, { search: query, ...listPage })
      : Promise.resolve(null),
    api.audience.getVariables(formId),
    api.audience.listProperties(formId),
    api.audience.getSettings(),
  ]);
}

type Lists = {
  test: AudiencePeoplePage;
  matches: AudiencePeoplePage | null;
  variables: AudienceVariables;
  properties: AudienceProperty[];
  identifierKind: AudienceIdentifierKind;
};

async function loadLists(request: PreviewAsRequest): Promise<Result<Lists>> {
  const [testApi, matchesApi, variablesApi, propertiesApi, settingsApi] =
    await fetchLists(request);
  const test = unwrap(testApi, "test participants");
  if (Result.isError(test)) return test;
  const matches = matchesApi && unwrap(matchesApi, "search");
  if (matches && Result.isError(matches)) return matches;
  const variables = unwrap(variablesApi, "variables");
  if (Result.isError(variables)) return variables;
  const properties = unwrap(propertiesApi, "properties");
  if (Result.isError(properties)) return properties;
  const settings = unwrap(settingsApi, "settings");
  if (Result.isError(settings)) return settings;
  return Result.success({
    test: test.value,
    matches: matches?.value ?? null,
    variables: variables.value,
    properties: properties.value,
    identifierKind: settings.value.identifierKind,
  });
}

/** The participant the link names, else the first match of a search, else the first Test one. */
function memberToPreview(request: PreviewAsRequest, lists: Lists) {
  if (request.memberId) return request.memberId;
  const first = lists.matches?.items[0] ?? lists.test.items[0];
  return first?.audienceMemberId;
}

async function loadSelection(
  { api, formId }: PreviewAsRequest,
  memberId: string,
): Promise<Result<PreviewAsSelection>> {
  const [personApi, presetApi] = await Promise.all([
    api.audience.getParticipant(formId, memberId),
    api.audience.getParticipantVariables(formId, memberId),
  ]);
  if (isNotFoundError(personApi) || isNotFoundError(presetApi))
    return Result.success({ status: "gone" });
  const person = unwrap<AudiencePerson>(personApi, "participant");
  if (Result.isError(person)) return person;
  const preset = unwrap<AudienceVariablePreset>(presetApi, "values");
  if (Result.isError(preset)) return preset;
  return Result.success({
    status: "found",
    person: person.value,
    variables: preset.value.variables,
  });
}

async function selectionFor(request: PreviewAsRequest, lists: Lists) {
  const memberId = memberToPreview(request, lists);
  if (!lists.variables.variablePresets || !memberId)
    return Result.success(null);
  return loadSelection(request, memberId);
}

/**
 * The Audience Preview as view: the saved form, the Test participants, everyone matching a
 * search, and the chosen participant's values. Reads only; the page has already checked Hub
 * access, `forms.edit` and the flag.
 */
export async function loadPreviewAs(
  request: PreviewAsRequest,
): Promise<Result<PreviewAsData>> {
  const [form, lists] = await Promise.all([
    loadForm(request),
    loadLists(request),
  ]);
  if (Result.isError(form)) return form;
  if (Result.isError(lists)) return lists;
  const selected = await selectionFor(request, lists.value);
  if (Result.isError(selected)) return selected;
  const { test, matches, variables, properties, identifierKind } = lists.value;
  return Result.success({
    form: form.value,
    hasVariables: variables.variablePresets !== null,
    testParticipants: [...test.items],
    totalTest: test.totalRecords,
    search: request.search?.trim() ?? "",
    matches: matches ? [...matches.items] : null,
    totalMatches: matches?.totalRecords ?? 0,
    selected: selected.value,
    identifierKind,
    properties: valueProperties(properties, identifierKind),
    canTest: request.canTest,
  });
}
