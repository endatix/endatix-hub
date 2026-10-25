import "server-only";

import type { EndatixApi } from "@/lib/endatix-api";
import type { AudiencePeoplePage } from "@/lib/endatix-api/audience/audience";
import type { FormDefinitionDto } from "@/lib/endatix-api/definitions/types";
import {
  AudiencePeopleTestFilter,
  type AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
  type AudienceSettings,
  type AudienceVariablePreset,
  type AudienceVariables,
} from "@/lib/endatix-api/audience/types";
import {
  isNotFoundError,
  isValidationError,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";
import { Result, toResult } from "@/lib/result";
import type { MapApiResultToResultOptions } from "@/lib/result/map-api-result-to-result";
import type { AudienceUsage } from "@/lib/personalization/audience-usage";
import { parseSurveyJson } from "@/lib/survey-js";
import { savedFormUsage } from "../get-audience-page/load-audience-usage.server";
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
  /** Every Property, the match key's included: what "Not filled in" counts, as on People. */
  allProperties: AudienceProperty[];
  /** What the saved form reads, the People list's verdict; `null` when there is none to read. */
  usage: AudienceUsage | null;
  canTest: boolean;
};

export type PreviewAsRequest = {
  api: EndatixApi;
  formId: string;
  /** From the form the page is still reading, so the lists start without it; none before the first save. */
  activeDefinitionId: Promise<string | undefined>;
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

function toPreviewForm(saved: FormDefinitionDto): PreviewAsForm | null {
  const definition = parseSurveyJson(saved.jsonData);
  if (!definition) return null;
  return {
    definition,
    savedAt: new Date(saved.modifiedAt ?? saved.createdAt).toISOString(),
    theme: saved.themeModel,
    customQuestions: saved.customQuestions ?? [],
  };
}

async function loadForm({
  api,
  formId,
  activeDefinitionId,
}: PreviewAsRequest): Promise<Result<PreviewAsForm | null>> {
  const definitionId = await activeDefinitionId;
  if (!definitionId) return Result.success(null);
  const saved = unwrap(await api.definitions.get(formId, definitionId), "form");
  if (Result.isError(saved)) return saved;
  return Result.success(toPreviewForm(saved.value));
}

type Values<T> = { [K in keyof T]: T[K] extends Result<infer V> ? V : never };

function allOk<T extends Record<string, Result<unknown>>>(
  parts: T,
): Result<Values<T>> {
  const failed = Object.values(parts).find((part) => Result.isError(part));
  if (failed && Result.isError(failed)) return failed;
  const values = Object.entries(parts).map(([key, part]) => [
    key,
    Result.isSuccess(part) ? part.value : undefined,
  ]);
  return Result.success(Object.fromEntries(values) as Values<T>);
}

const listPage = { page: 1, pageSize: PREVIEW_LIST_SIZE };

async function searchPeople({ api, formId, search }: PreviewAsRequest) {
  const query = search?.trim();
  if (!query) return Result.success(null);
  const found = await api.audience.listPeople(formId, {
    search: query,
    ...listPage,
  });
  return unwrap(found, "search");
}

type Lists = {
  test: AudiencePeoplePage;
  matches: AudiencePeoplePage | null;
  variables: AudienceVariables;
  properties: AudienceProperty[];
  settings: AudienceSettings;
};

async function loadLists(request: PreviewAsRequest): Promise<Result<Lists>> {
  const { api, formId } = request;
  const [test, matches, variables, properties, settings] = await Promise.all([
    api.audience.listPeople(formId, {
      test: AudiencePeopleTestFilter.Test,
      ...listPage,
    }),
    searchPeople(request),
    api.audience.getVariables(formId),
    api.audience.listProperties(formId),
    api.audience.getSettings(),
  ]);
  return allOk({
    test: unwrap(test, "test participants"),
    matches,
    variables: unwrap(variables, "variables"),
    properties: unwrap(properties, "properties"),
    settings: unwrap(settings, "settings"),
  });
}

/** The participant the link names, else the first match of a search, else the first Test one. */
function memberToPreview(request: PreviewAsRequest, lists: Lists) {
  if (request.memberId) return request.memberId;
  const first = lists.matches?.items[0] ?? lists.test.items[0];
  return first?.audienceMemberId;
}

function fetchSelection({ api, formId }: PreviewAsRequest, memberId: string) {
  return Promise.all([
    api.audience.getParticipant(formId, memberId),
    api.audience.getParticipantVariables(formId, memberId),
  ]);
}

/** A link to someone no longer on the form, or with an id that never named anyone (hand-edited). */
function isMissing<T>(result: ApiResult<T>): boolean {
  return isNotFoundError(result) || isValidationError(result);
}

async function loadSelection(
  request: PreviewAsRequest,
  memberId: string,
): Promise<Result<PreviewAsSelection>> {
  const [person, preset] = await fetchSelection(request, memberId);
  if (isMissing(person) || isMissing(preset))
    return Result.success({ status: "gone" });
  const found = allOk({
    person: unwrap<AudiencePerson>(person, "participant"),
    values: unwrap<AudienceVariablePreset>(preset, "values"),
  });
  if (Result.isError(found)) return found;
  const { person: participant, values } = found.value;
  const { variables } = values;
  return Result.success({ status: "found", person: participant, variables });
}

/** The Audience tab's own test for showing Preview as. */
function hasProperties(lists: Lists): boolean {
  return lists.properties.length > 0;
}

async function selectionFor(request: PreviewAsRequest, lists: Lists) {
  const memberId = memberToPreview(request, lists);
  if (!hasProperties(lists) || !memberId) return Result.success(null);
  return loadSelection(request, memberId);
}

type Loaded = {
  form: PreviewAsForm | null;
  lists: Lists;
  selected: PreviewAsSelection | null;
};

function usageOf(
  form: PreviewAsForm | null,
  { variables }: Lists,
  formId: string,
) {
  return form ? savedFormUsage(form.definition, variables, formId) : null;
}

/** Value properties for Edit values, and every one for "Not filled in". */
function propertiesOf(
  properties: AudienceProperty[],
  identifierKind: AudienceIdentifierKind,
) {
  return {
    properties: valueProperties(properties, identifierKind),
    allProperties: properties,
  };
}

function toPreviewAsData(
  { form, lists, selected }: Loaded,
  request: PreviewAsRequest,
): PreviewAsData {
  const { test, matches, properties, settings } = lists;
  const { identifierKind } = settings;
  return {
    form,
    hasVariables: hasProperties(lists),
    testParticipants: [...test.items],
    totalTest: test.totalRecords,
    search: request.search?.trim() ?? "",
    matches: matches ? [...matches.items] : null,
    totalMatches: matches?.totalRecords ?? 0,
    selected,
    identifierKind,
    ...propertiesOf(properties, identifierKind),
    usage: usageOf(form, lists, request.formId),
    canTest: request.canTest,
  };
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
  const loaded = allOk({ form, lists });
  if (Result.isError(loaded)) return loaded;
  const selected = await selectionFor(request, loaded.value.lists);
  if (Result.isError(selected)) return selected;
  return Result.success(
    toPreviewAsData({ ...loaded.value, selected: selected.value }, request),
  );
}
