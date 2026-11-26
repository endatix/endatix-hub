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

function useCanvasSubmission(creator: SurveyCreatorModel | null) {
  const pending = useRef<{ definition: object } | null>(null);
  const saveCanvas = useCallback(async <T extends Result<unknown> | undefined>(
    submitted: object, write: (definition: object) => Promise<T>,
  ) => {
    const attempt = { definition: submitted };
    // A JSON-tab submission not yet on the canvas still needs its normal hydration.
    pending.current = creator && isSameDefinition(creator.JSON, submitted) ? attempt : null;
    let confirmed = false;
    try {
      const result = await write(submitted);
      confirmed = !!result && Result.isSuccess(result);
      const stillSaved = (current: Result<object>) => Result.isSuccess(current) && isSameDefinition(current.value, submitted);
      return { result, stillSaved };
    } finally {
      if (!confirmed && pending.current === attempt) pending.current = null;
    }
  }, [creator]);
  return { pending, saveCanvas };
}

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const lastRead = useRef<{ creator: SurveyCreatorModel; json: object } | null>(null);
  const { pending, saveCanvas } = useCanvasSubmission(creator);

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current;
    const sameCreator = previous?.creator === creator;
    if (sameCreator && isSameDefinition(previous.json, json)) return;

    const submitted = isSameDefinition(pending.current?.definition ?? null, json);
    if (!sameCreator || (!submitted && !isSameDefinition(creator.JSON, json))) {
      creator.JSON = json;
    }
    lastRead.current = { creator, json };
    pending.current = null;
  }, [creator, json, pending]);

  return saveCanvas;
}
