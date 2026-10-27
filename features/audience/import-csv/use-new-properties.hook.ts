"use client";

import { useMemo, useRef, useState } from "react";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { createAudiencePropertyAction } from "../create-property/create-audience-property.action";
import { variableNameFromName } from "../property-types";
import { checkPropertyNamesAction } from "./check-property-names.action";
import { checkNamesInChunks, NAME_CHECK_FAILED } from "./check-names";
import type { ColumnMap } from "./column-map";
import {
  candidateVariables,
  checkDraftName,
  draftOf,
  type NameCheck,
  type PropertyDraft,
  type VariableHolder,
} from "./new-properties";
import type { LoadedFile } from "./use-import-csv.hook";

type DraftEdit = { name?: string; dataType?: AudienceDataType };

/** A draft with what its name collides with, as the New properties step shows it. */
export type CheckedDraft = PropertyDraft & { check: NameCheck };

/** Every value of a column across the file's rows, for its type suggestion. */
function columnValues(file: LoadedFile, column: string): string[] {
  const at = file.preview.headers.indexOf(column);
  return file.rows.map((row) => row.cells[at] ?? "");
}

/** Each queued column's draft before any edit, worked out once per file. */
function useBaseDrafts(file: LoadedFile | null) {
  const { drafts } = useMemo(
    () => ({ file, drafts: new Map<string, PropertyDraft>() }),
    [file],
  );
  return (column: string): PropertyDraft => {
    let draft = drafts.get(column);
    if (!draft) {
      draft = draftOf(column, file ? columnValues(file, column) : []);
      drafts.set(column, draft);
    }
    return draft;
  };
}

const variablesToAsk = (names: readonly string[]) => [
  ...new Set(names.flatMap((name) => candidateVariables(name))),
];

/** The lower-case variables the saved form writes, with what writes them; `null` when the check failed. */
async function formTaken(formId: string, variables: string[]) {
  const result = await checkNamesInChunks(variables, (chunk) =>
    checkPropertyNamesAction(formId, chunk),
  );
  if (Result.isError(result)) return null;
  return result.value.map(
    ({ variable, declaredBy }) => [variable.toLowerCase(), declaredBy] as const,
  );
}

type Taken = readonly (readonly [string, VariableHolder])[] | null;

/** A failed check is not an answer. Drop it so Retry or the next blur asks again. */
function storeTaken(
  taken: Taken,
  variables: string[],
  bag: {
    known: Map<string, VariableHolder>;
    asked: Map<string, Promise<void>>;
    failed: { current: boolean };
    onAnswer: () => void;
  },
) {
  if (!taken) {
    bag.failed.current = true;
    variables.forEach((variable) => bag.asked.delete(variable));
    return;
  }
  taken.forEach(([variable, holder]) => bag.known.set(variable, holder));
  bag.onAnswer();
}

/** One request per variable, kept while it runs and after it answers; a failed one is asked again. */
function useFormAnswers(formId: string) {
  const known = useRef(new Map<string, VariableHolder>());
  const asked = useRef(new Map<string, Promise<void>>());
  const failed = useRef(false);
  const ask = (variables: string[], onAnswer: () => void) => {
    const request = formTaken(formId, variables).then((taken) =>
      storeTaken(taken, variables, {
        known: known.current, asked: asked.current, failed, onAnswer,
      }),
    );
    variables.forEach((variable) => asked.current.set(variable, request));
  };
  const reset = () => {
    known.current = new Map();
    asked.current = new Map();
    failed.current = false;
  };
  return { known, asked, ask, failed, reset };
}

type Answers = ReturnType<typeof useFormAnswers>;

function pendingAnswers(answers: Answers, variables: readonly string[]) {
  return variables.map(
    (variable) => answers.asked.current.get(variable) ?? Promise.resolve(),
  );
}

/** Resolves, once every answer is in, to the lower-case variables of `names` the form writes. */
async function answeredNames(
  answers: Answers,
  names: readonly string[],
  onFound: (found: ReadonlyMap<string, VariableHolder>) => void,
) {
  answers.failed.current = false;
  const variables = variablesToAsk(names);
  const fresh = variables.filter((v) => !answers.asked.current.has(v));
  if (fresh.length > 0)
    answers.ask(fresh, () => onFound(new Map(answers.known.current)));
  await Promise.all(pendingAnswers(answers, variables));
  if (answers.failed.current) return { ok: false as const };
  return {
    ok: true as const,
    taken: variables.filter((v) => answers.known.current.has(v)),
  };
}

/**
 * What the saved form already writes, by lower-case variable name, from the server's lint. Each
 * name is asked about with the suffixed names a suggestion may take; a check waits for one running.
 */
function useFormCollisions(formId: string) {
  const [found, setFound] = useState<ReadonlyMap<string, VariableHolder>>(
    new Map(),
  );
  const answers = useFormAnswers(formId);
  const check = (names: readonly string[]) =>
    answeredNames(answers, names, setFound);
  const reset = () => {
    answers.reset();
    setFound(new Map());
  };
  return { found, check, reset };
}

function holderFor(
  draft: PropertyDraft,
  drafts: readonly PropertyDraft[],
  taken: { form: ReadonlyMap<string, VariableHolder>; properties: Set<string> },
) {
  const others = new Set(
    drafts
      .filter((other) => other.column !== draft.column)
      .map((other) => variableNameFromName(other.name)),
  );
  return (variable: string): VariableHolder | null => {
    const key = variable.toLowerCase();
    if (taken.form.has(key)) return taken.form.get(key) ?? null;
    if (taken.properties.has(key)) return "property";
    return others.has(key) ? "column" : null;
  };
}

function checkedDrafts(
  drafts: readonly PropertyDraft[],
  form: ReadonlyMap<string, VariableHolder>,
  properties: readonly AudienceProperty[],
): CheckedDraft[] {
  const taken = {
    form,
    properties: new Set(properties.map((p) => p.variableName.toLowerCase())),
  };
  return drafts.map((draft) => ({
    ...draft,
    check: checkDraftName(draft.name, holderFor(draft, drafts, taken)),
  }));
}

const createInput = (formId: string, draft: PropertyDraft) => ({
  formId,
  name: draft.name,
  dataType: draft.dataType,
  choicesJson:
    draft.dataType === AudienceDataType.SingleChoice
      ? JSON.stringify(draft.suggestion.choices)
      : null,
});

type NewPropertiesSetup = {
  formId: string;
  file: LoadedFile | null;
  /** The columns the Columns step queued to create a property, in file order. */
  queued: string[];
  /** The form's properties, with the ones created here. */
  properties: readonly AudienceProperty[];
  /** Maps a column to the property just created for it, so a retry never creates it twice. */
  onCreated: (column: string, property: AudienceProperty) => void;
};

/** The scripter's edits to each queued column's draft. */
function useDraftEdits() {
  const [edits, setEdits] = useState<Record<string, DraftEdit>>({});
  const edit = (column: string, change: DraftEdit) =>
    setEdits((current) => ({
      ...current,
      [column]: { ...current[column], ...change },
    }));
  return { edits, edit, reset: () => setEdits({}) };
}

type OnCreated = NewPropertiesSetup["onCreated"];

/** Creates each draft in turn, mapping its column as it goes; stops at the first refusal. */
async function createAll(
  formId: string,
  drafts: readonly PropertyDraft[],
  onCreated: OnCreated,
): Promise<Result<ColumnMap>> {
  const map: ColumnMap = {};
  for (const draft of drafts) {
    const result = await createAudiencePropertyAction(
      createInput(formId, draft),
    );
    if (Result.isError(result)) return result;
    map[draft.column] = result.value.variableName;
    onCreated(draft.column, result.value);
  }
  return Result.success(map);
}

/** The creates' pending and refusal; `run` resolves to the columns mapped, or `null`. */
function useDraftCreates(formId: string, onCreated: OnCreated) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (drafts: readonly PropertyDraft[]) => {
    setError(null);
    setCreating(true);
    try {
      const created = await createAll(formId, drafts, onCreated);
      if (Result.isSuccess(created)) return created.value;
      setError(created.message);
      return null;
    } finally {
      setCreating(false);
    }
  };
  return { creating, error, setError, run };
}

type Collisions = ReturnType<typeof useFormCollisions>;
type Creates = ReturnType<typeof useDraftCreates>;

/** Waits for the form's answer first: a warning not shown yet shows, and the next Continue creates. */
async function createChecked(
  drafts: CheckedDraft[],
  collisions: Collisions,
  creates: Creates,
): Promise<ColumnMap | null> {
  creates.setError(null);
  const outcome = await collisions.check(drafts.map((draft) => draft.name));
  if (!outcome.ok) {
    creates.setError(NAME_CHECK_FAILED);
    return null;
  }
  const unseen = (draft: CheckedDraft) =>
    !draft.check.holder && outcome.taken.includes(draft.check.variableName);
  if (drafts.some((draft) => unseen(draft))) return null;
  return creates.run(drafts);
}

/** Each queued column's draft with the scripter's edits, and what holds its name. */
function useCheckedDrafts(
  setup: NewPropertiesSetup,
  edits: Record<string, DraftEdit>,
  found: ReadonlyMap<string, VariableHolder>,
): CheckedDraft[] {
  const baseDraft = useBaseDrafts(setup.file);
  const plain = setup.queued.map((column) => ({
    ...baseDraft(column),
    ...edits[column],
  }));
  return checkedDrafts(plain, found, setup.properties);
}

/**
 * The New properties step: a draft per queued column (tidied name, suggested type with its
 * evidence), warnings for names something already holds, and the creates. Nothing is created
 * until `create`, which the step's Continue runs; each property is created once.
 */
export function useNewProperties(setup: NewPropertiesSetup) {
  const edits = useDraftEdits();
  const collisions = useFormCollisions(setup.formId);
  const creates = useDraftCreates(setup.formId, setup.onCreated);
  const drafts = useCheckedDrafts(setup, edits.edits, collisions.found);
  const [submitting, setSubmitting] = useState(false);
  const create = async () => {
    setSubmitting(true);
    try {
      return await createChecked(drafts, collisions, creates);
    } finally {
      setSubmitting(false);
    }
  };
  return {
    drafts,
    creating: creates.creating || submitting,
    error: creates.error,
    canCreate: drafts.every((draft) => !draft.check.invalid),
    create,
    ...editControls(edits),
    ...checkControls(collisions, drafts),
    ...resetControls(edits, collisions, creates),
  };
}

function resetControls(
  edits: ReturnType<typeof useDraftEdits>,
  collisions: Collisions,
  creates: Creates,
) {
  return {
    clearError: () => creates.setError(null),
    reset: () => {
      edits.reset();
      collisions.reset();
      creates.setError(null);
    },
  };
}

function editControls(edits: ReturnType<typeof useDraftEdits>) {
  return {
    setName: (column: string, name: string) => edits.edit(column, { name }),
    setDataType: (column: string, dataType: AudienceDataType) =>
      edits.edit(column, { dataType }),
  };
}

function checkControls(
  collisions: Collisions,
  drafts: readonly PropertyDraft[],
) {
  return {
    /** Asks the form about every draft's name: on arriving at the step. */
    checkAll: () => void collisions.check(drafts.map((draft) => draft.name)),
    /** Asks the form about one draft's name: when its field loses focus. */
    checkName: (name: string) => void collisions.check([name]),
  };
}

export type NewProperties = ReturnType<typeof useNewProperties>;
