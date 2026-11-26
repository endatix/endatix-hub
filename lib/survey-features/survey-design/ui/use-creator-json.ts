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
  const submittedJson = useRef<object | null>(null);
  const rememberCanvasSave = useCallback((submitted: object) => {
    // A JSON-tab submission not yet on the canvas still needs its normal hydration.
    submittedJson.current = creator && isSameDefinition(creator.JSON, submitted) ? submitted : null;
    return (current: Result<object>) => Result.isSuccess(current) && isSameDefinition(current.value, submitted);
  }, [creator]);
  return { submittedJson, rememberCanvasSave };
}

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const lastRead = useRef<{ creator: SurveyCreatorModel; json: object } | null>(null);
  const { submittedJson, rememberCanvasSave } = useCanvasSubmission(creator);

  useEffect(() => {
    if (!creator || !json) return;
    const previous = lastRead.current;
    const sameCreator = previous?.creator === creator;
    if (sameCreator && isSameDefinition(previous.json, json)) return;

    const submitted = isSameDefinition(submittedJson.current, json);
    if (!sameCreator || (!submitted && !isSameDefinition(creator.JSON, json))) {
      creator.JSON = json;
    }
    lastRead.current = { creator, json };
    submittedJson.current = null;
  }, [creator, json, submittedJson]);

  return rememberCanvasSave;
}
