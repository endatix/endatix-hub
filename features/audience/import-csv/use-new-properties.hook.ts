"use client";

import { useRef, useState } from "react";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { createAudiencePropertyAction } from "../create-property/create-audience-property.action";
import { variableNameFromName } from "../property-types";
import { checkPropertyNamesAction } from "./check-property-names.action";
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
  const cache = useRef({ file, drafts: new Map<string, PropertyDraft>() });
  if (cache.current.file !== file) cache.current = { file, drafts: new Map() };
  const { drafts } = cache.current;
  return (column: string): PropertyDraft => {
    let draft = drafts.get(column);
    if (!draft) {
      draft = draftOf(column, file ? columnValues(file, column) : []);
      drafts.set(column, draft);
    }
    return draft;
  };
}

/**
 * What the saved form already writes, by lower-case variable name, from the server's lint. Each
 * name is asked about once, with the suffixed names a suggestion may take.
 */
function useFormCollisions(formId: string) {
  const [found, setFound] = useState<ReadonlyMap<string, VariableHolder>>(
    new Map(),
  );
  const asked = useRef(new Set<string>());
  /** Asks about the names not asked yet; resolves to the lower-case variables found taken. */
  const check = async (names: string[]): Promise<string[]> => {
    const fresh = [
      ...new Set(names.flatMap((name) => candidateVariables(name))),
    ].filter((variable) => !asked.current.has(variable));
    if (fresh.length === 0) return [];
    for (const variable of fresh) asked.current.add(variable);
    const result = await checkPropertyNamesAction(formId, fresh);
    // A failed check only loses the warning; it never holds the import.
    if (Result.isError(result)) return [];
    const taken = result.value.map(
      ({ variable, declaredBy }) =>
        [variable.toLowerCase(), declaredBy] as const,
    );
    setFound((current) => new Map([...current, ...taken]));
    return taken.map(([variable]) => variable);
  };
  const reset = () => {
    asked.current = new Set();
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

/**
 * The New properties step: a draft per queued column (tidied name, suggested type with its
 * evidence), warnings for names something already holds, and the creates. Nothing is created
 * until `create`, which the step's Continue runs; each property is created once.
 */
export function useNewProperties(setup: NewPropertiesSetup) {
  const { formId, queued, properties, onCreated } = setup;
  const state = useDraftEdits();
  const baseDraft = useBaseDrafts(setup.file);
  const collisions = useFormCollisions(formId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plain = queued.map((column) => ({
    ...baseDraft(column),
    ...state.edits[column],
  }));
  const drafts = checkedDrafts(plain, collisions.found, properties);
  const names = () => drafts.map((draft) => draft.name);

  /** Creates each draft in turn and maps its column; `null` when one fails or a new warning shows. */
  const create = async (): Promise<ColumnMap | null> => {
    setError(null);
    const taken = await collisions.check(names());
    if (drafts.some((d) => taken.includes(d.check.variableName))) return null;
    setCreating(true);
    const map: ColumnMap = {};
    try {
      for (const draft of drafts) {
        const result = await createAudiencePropertyAction(
          createInput(formId, draft),
        );
        if (Result.isError(result)) {
          setError(result.message);
          return null;
        }
        map[draft.column] = result.value.variableName;
        onCreated(draft.column, result.value);
      }
      return map;
    } finally {
      setCreating(false);
    }
  };

  return {
    drafts,
    creating,
    error,
    canCreate: drafts.every((draft) => !draft.check.invalid),
    create,
    setName: (column: string, name: string) => state.edit(column, { name }),
    setDataType: (column: string, dataType: AudienceDataType) =>
      state.edit(column, { dataType }),
    /** Asks the form about every draft's name: on arriving at the step. */
    checkAll: () => void collisions.check(names()),
    /** Asks the form about one draft's name: when its field loses focus. */
    checkName: (name: string) => void collisions.check([name]),
    clearError: () => setError(null),
    reset: () => {
      state.reset();
      collisions.reset();
      setError(null);
    },
  };
}

export type NewProperties = ReturnType<typeof useNewProperties>;
