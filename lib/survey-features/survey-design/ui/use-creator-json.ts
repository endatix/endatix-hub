"use client";

import { useCallback, useEffect, useRef } from "react";
import { Helpers } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { Result } from "@/lib/result/result";

/** Definition equality — survey-core defaults compare answers. See AGENTS.md SurveyJS domain. */
const SAME_DEFINITION = {
  ignoreOrder: false,
  caseSensitive: true,
  trimStrings: false,
  doNotConvertNumbers: true,
} as const;

function isSameDefinition(left: object | null, right: object): boolean {
  return Helpers.checkIfValuesEqual(left, right, SAME_DEFINITION);
}

type CaptureJsonSave = () => () => boolean;

function captureSavedDefinition(submitted: object, captureJsonSave: CaptureJsonSave) {
  const acknowledgeBuffer = captureJsonSave();
  return (current: Result<object>) =>
    acknowledgeBuffer() && Result.isSuccess(current) && isSameDefinition(current.value, submitted);
}

function useCanvasSubmission(captureJsonSave: CaptureJsonSave) {
  const pending = useRef<{ definition: object } | null>(null);
  const saveCanvas = useCallback(async <T extends Result<unknown> | undefined>(
    submitted: object, write: (definition: object) => Promise<T>,
  ) => {
    const attempt = { definition: submitted };
    const stillSaved = captureSavedDefinition(submitted, captureJsonSave);
    // Reading creator.JSON here would apply the pending Ace buffer to the canvas.
    pending.current = attempt;
    let confirmed = false;
    try {
      const result = await write(submitted);
      confirmed = !!result && Result.isSuccess(result);
      return { result, stillSaved };
    } finally {
      if (!confirmed && pending.current === attempt) pending.current = null;
    }
  }, [captureJsonSave]);
  return { pending, saveCanvas };
}

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
  captureJsonSave: CaptureJsonSave,
) {
  const lastRead = useRef<{ creator: SurveyCreatorModel; json: object } | null>(null);
  const { pending, saveCanvas } = useCanvasSubmission(captureJsonSave);

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current?.creator === creator ? lastRead.current.json : null;
    if (isSameDefinition(previous, json)) return;

    const submitted = isSameDefinition(pending.current?.definition ?? null, json);
    if (!previous || (!submitted && !isSameDefinition(creator.JSON, json))) {
      creator.JSON = json;
    }
    lastRead.current = { creator, json };
    pending.current = null;
  }, [creator, json, pending]);

  return saveCanvas;
}
