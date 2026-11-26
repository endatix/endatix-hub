"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { SurveyCreatorModel, TabJsonEditorBasePlugin } from "survey-creator-core";
import type { AceJsonPlugin } from "../../json-editor/json-editor-state";
import type { DefinitionRevision } from "../definition-revision";
import { Result } from "@/lib/result/result";
import { SURVEY_CREATOR_BUILT_IN_TAB } from "@/lib/survey-js";

function isSameDefinition(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key =>
    Object.hasOwn(right, key) && isSameDefinition(Reflect.get(left, key), Reflect.get(right, key)),
  );
}

type CaptureJsonSave = () => () => boolean;
interface SavedDefinitionOptions {
  revision?: DefinitionRevision;
  captureJsonSave: CaptureJsonSave;
  onExternalRead?: () => void;
  proposal?: object | null;
}

function loadDefinition(creator: SurveyCreatorModel, definition: object, captureJsonSave: CaptureJsonSave) {
  if (creator.activeTab !== SURVEY_CREATOR_BUILT_IN_TAB.json) {
    creator.JSON = definition;
    return;
  }
  // On the JSON tab creator.JSON only calls the vendor's optional text callback.
  // Load the canvas and the mounted editor; Ace initializes from the canvas if not mounted yet.
  const text = JSON.stringify(definition, null, 2);
  creator.text = text;
  const model = creator.getPlugin<TabJsonEditorBasePlugin>("json").model as AceJsonPlugin;
  if (!model?.aceEditor) return;
  model.text = text;
  model.isJSONChanged = false;
  captureJsonSave()();
}

function captureSavedDefinition(creator: SurveyCreatorModel | null, submitted: object, captureJsonSave: CaptureJsonSave) {
  const jsonTab = SURVEY_CREATOR_BUILT_IN_TAB.json;
  const startedOnJson = creator?.activeTab === jsonTab;
  const acknowledgeBuffer = captureJsonSave();
  return (current: Result<object>) =>
    (acknowledgeBuffer() || (startedOnJson && creator.activeTab !== jsonTab)) &&
    Result.isSuccess(current) && isSameDefinition(current.value, submitted);
}

type Submission = { definition: object; confirmed: boolean; startedAt?: DefinitionRevision };

async function writeSubmission<T extends Result<unknown> | undefined>(
  pending: Set<Submission>, attempt: Submission, write: (definition: object) => Promise<T>,
) {
  pending.add(attempt);
  try {
    const result = await write(attempt.definition);
    attempt.confirmed = !!result && Result.isSuccess(result);
    return result;
  } finally {
    if (!attempt.confirmed) pending.delete(attempt);
  }
}

function takeReadback(pending: Set<Submission>, json: object, previous: object | null) {
  const match = [...pending].findLast(attempt => isSameDefinition(attempt.definition, json));
  if (!match && isSameDefinition(previous, json)) return false;
  // A newer read supersedes completed saves that React never rendered separately.
  // In-flight writes may still supply a delayed response of their own.
  for (const attempt of pending) {
    if (attempt === match) break;
    if (attempt.confirmed) pending.delete(attempt);
  }
  return match !== undefined && pending.delete(match);
}

function useCanvasSubmission(creator: SurveyCreatorModel | null, { captureJsonSave, revision }: SavedDefinitionOptions) {
  const session = useMemo(() => ({ creator, pending: new Set<Submission>() }), [creator]);
  const latest = useRef<Submission | null>(null);
  const saveCanvas = useCallback(async <T extends Result<unknown> | undefined>(
    submitted: object, write: (definition: object) => Promise<T>,
  ) => {
    const attempt = { definition: submitted, confirmed: false, startedAt: revision };
    const matches = captureSavedDefinition(session.creator, submitted, captureJsonSave);
    latest.current = attempt;
    // Reading creator.JSON here would apply the pending Ace buffer to the canvas.
    const result = await writeSubmission(session.pending, attempt, write);
    const stillSaved = (current: Result<object>) => latest.current === attempt && matches(current);
    return { result, stillSaved };
  }, [session, captureJsonSave, revision]);
  return { pending: session.pending, saveCanvas };
}

interface ReadSnapshot {
  creator: SurveyCreatorModel;
  json: object;
  revision?: DefinitionRevision;
}

function precedes(earlier?: DefinitionRevision, later?: DefinitionRevision) {
  return earlier && later && earlier.id === later.id && earlier.updatedAt < later.updatedAt;
}

function retireStaleRead(snapshot: ReadSnapshot, pending: Set<Submission>) {
  const match = [...pending].find(attempt =>
    (!attempt.startedAt || precedes(attempt.startedAt, snapshot.revision)) &&
    isSameDefinition(attempt.definition, snapshot.json),
  );
  if (match) pending.delete(match);
}

function isDistinctExternalRead(snapshot: ReadSnapshot, previous: ReadSnapshot | null, pending: Set<Submission>) {
  const previousJson = previous?.json ?? null;
  const submitted = takeReadback(pending, snapshot.json, previousJson);
  return !submitted && !isSameDefinition(previousJson, snapshot.json);
}

function needsAssignment(snapshot: ReadSnapshot, previous: ReadSnapshot | null) {
  const { creator, json } = snapshot;
  // Reading creator.JSON on the JSON tab would apply or reject Ace's draft.
  return !previous || creator.activeTab === SURVEY_CREATOR_BUILT_IN_TAB.json || !isSameDefinition(creator.JSON, json);
}

function useSavedSnapshot(
  creator: SurveyCreatorModel | null,
  json: object | null,
  { pending, captureJsonSave, onExternalRead, revision }: SavedDefinitionOptions & { pending: Set<Submission> },
) {
  const lastRead = useRef<ReadSnapshot | null>(null);
  const notifyExternalRead = useEffectEvent(() => onExternalRead?.());

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current?.creator === creator ? lastRead.current : null;
    const snapshot = { creator, json, revision };
    if (precedes(revision, previous?.revision)) return retireStaleRead(snapshot, pending);
    lastRead.current = snapshot;
    if (!isDistinctExternalRead(snapshot, previous, pending)) return;
    if (needsAssignment(snapshot, previous)) loadDefinition(creator, json, captureJsonSave);
    if (previous) notifyExternalRead();
  }, [creator, json, pending, captureJsonSave, revision]);
}

/** Saved readbacks preserve live edits; assistant proposals explicitly change the canvas. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
  options: SavedDefinitionOptions,
) {
  const { captureJsonSave, proposal } = options;
  const { pending, saveCanvas } = useCanvasSubmission(creator, options);
  useSavedSnapshot(creator, json, { ...options, pending });
  useEffect(() => {
    if (creator && proposal) loadDefinition(creator, proposal, captureJsonSave);
  }, [creator, proposal, captureJsonSave]);

  return saveCanvas;
}
