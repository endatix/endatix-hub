"use client";

import { useEffect, useRef } from "react";
import { Helpers } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";

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

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const appliedToRef = useRef<SurveyCreatorModel | null>(null);
  const lastServerJsonRef = useRef<object | null>(null);

  useEffect(() => {
    if (!creator || !json) {
      return;
    }

    const sameCreator = appliedToRef.current === creator;
    if (sameCreator && isSameDefinition(lastServerJsonRef.current, json)) {
      return;
    }

    if (!sameCreator || !isSameDefinition(creator.JSON, json)) {
      creator.JSON = json;
    }
    appliedToRef.current = creator;
    lastServerJsonRef.current = json;
  }, [creator, json]);
}
