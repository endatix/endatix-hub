"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
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
  pending: Set<Submission>,
) {
  const lastRead = useRef<{ creator: SurveyCreatorModel; json: object } | null>(null);

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current?.creator === creator ? lastRead.current.json : null;
    const submitted = takeReadback(pending, json, previous);
    if (isSameDefinition(previous, json)) return;
    if (!submitted && (!previous || !isSameDefinition(creator.JSON, json))) {
      creator.JSON = json;
    }
    lastRead.current = { creator, json };
  }, [creator, json, pending]);
}

/** Saved readbacks preserve live edits; assistant proposals explicitly change the canvas. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
  { captureJsonSave, proposal }: { captureJsonSave: CaptureJsonSave; proposal?: object | null },
) {
  const { pending, saveCanvas } = useCanvasSubmission(creator, captureJsonSave);
  useSavedSnapshot(creator, json, pending);
  useEffect(() => {
    if (creator && proposal) creator.JSON = proposal;
  }, [creator, proposal]);

  return saveCanvas;
}
