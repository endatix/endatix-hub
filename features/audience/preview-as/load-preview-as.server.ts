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

function toPreviewForm(saved: FormDefinitionDto): PreviewAsForm | null {
  const definition = parseDefinition(saved.jsonData);
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
  if (!activeDefinitionId) return Result.success(null);
  const saved = unwrap(
    await api.definitions.get(formId, activeDefinitionId),
    "form",
  );
  if (Result.isError(saved)) return saved;
  return Result.success(toPreviewForm(saved.value));
}

type Values<T> = { [K in keyof T]: T[K] extends Result<infer V> ? V : never };

/** Every part's value, or the first part that failed. */
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

async function loadSelection(
  request: PreviewAsRequest,
  memberId: string,
): Promise<Result<PreviewAsSelection>> {
  const [person, preset] = await fetchSelection(request, memberId);
  if (isNotFoundError(person) || isNotFoundError(preset))
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

async function selectionFor(request: PreviewAsRequest, lists: Lists) {
  const memberId = memberToPreview(request, lists);
  if (!lists.variables.variablePresets || !memberId)
    return Result.success(null);
  return loadSelection(request, memberId);
}

type Loaded = {
  form: PreviewAsForm | null;
  lists: Lists;
  selected: PreviewAsSelection | null;
};

function toPreviewAsData(
  { form, lists, selected }: Loaded,
  request: PreviewAsRequest,
): PreviewAsData {
  const { test, matches, variables, properties, settings } = lists;
  const { identifierKind } = settings;
  return {
    form,
    hasVariables: variables.variablePresets !== null,
    testParticipants: [...test.items],
    totalTest: test.totalRecords,
    search: request.search?.trim() ?? "",
    matches: matches ? [...matches.items] : null,
    totalMatches: matches?.totalRecords ?? 0,
    selected,
    identifierKind,
    properties: valueProperties(properties, identifierKind),
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
