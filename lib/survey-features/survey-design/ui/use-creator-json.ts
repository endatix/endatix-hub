"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SurveyCreatorModel, TabJsonEditorBasePlugin } from "survey-creator-core";
import type { AceJsonPlugin } from "../../json-editor/json-editor-state";
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

type Submission = { definition: object; confirmed: boolean };

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

function useCanvasSubmission(creator: SurveyCreatorModel | null, captureJsonSave: CaptureJsonSave) {
  const session = useMemo(() => ({ creator, pending: new Set<Submission>() }), [creator]);
  const latest = useRef<Submission | null>(null);
  const saveCanvas = useCallback(async <T extends Result<unknown> | undefined>(
    submitted: object, write: (definition: object) => Promise<T>,
  ) => {
    const attempt = { definition: submitted, confirmed: false };
    const matches = captureSavedDefinition(session.creator, submitted, captureJsonSave);
    latest.current = attempt;
    // Reading creator.JSON here would apply the pending Ace buffer to the canvas.
    const result = await writeSubmission(session.pending, attempt, write);
    const stillSaved = (current: Result<object>) => latest.current === attempt && matches(current);
    return { result, stillSaved };
  }, [session, captureJsonSave]);
  return { pending: session.pending, saveCanvas };
}

function useSavedSnapshot(
  creator: SurveyCreatorModel | null,
  json: object | null,
  { pending, captureJsonSave }: { pending: Set<Submission>; captureJsonSave: CaptureJsonSave },
) {
  const lastRead = useRef<{ creator: SurveyCreatorModel; json: object } | null>(null);

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current?.creator === creator ? lastRead.current.json : null;
    const submitted = takeReadback(pending, json, previous);
    if (isSameDefinition(previous, json)) return;
    if (!submitted && (!previous || !isSameDefinition(creator.JSON, json))) {
      loadDefinition(creator, json, captureJsonSave);
    }
    lastRead.current = { creator, json };
  }, [creator, json, pending, captureJsonSave]);
}

/** Saved readbacks preserve live edits; assistant proposals explicitly change the canvas. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
  { captureJsonSave, proposal }: { captureJsonSave: CaptureJsonSave; proposal?: object | null },
) {
  const { pending, saveCanvas } = useCanvasSubmission(creator, captureJsonSave);
  useSavedSnapshot(creator, json, { pending, captureJsonSave });
  useEffect(() => {
    if (creator && proposal) loadDefinition(creator, proposal, captureJsonSave);
  }, [creator, proposal, captureJsonSave]);

  return saveCanvas;
}
