"use client";

import { useEffect, useRef } from "react";
import { Helpers } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { bindConversionSource, conversionSession, unbindConversionSource } from "../../form-diagnostics/conversion-session";

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

type Applied = { creator: SurveyCreatorModel; json: object };

function alreadyLoaded(creator: SurveyCreatorModel, json: object, last: Applied | null) {
  if (last?.creator !== creator) return false;
  return conversionSession(creator)?.isSubmitted(json) || isSameDefinition(last.json, json) ||
    isSameDefinition(creator.JSON, json);
}

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const last = useRef<Applied | null>(null);
  useEffect(() => () => {
    if (creator) unbindConversionSource(creator);
    last.current = null;
  }, [creator]);

  useEffect(() => {
    if (!creator || !json || alreadyLoaded(creator, json, last.current)) return;
    creator.JSON = json;
    bindConversionSource(creator, json);
    last.current = { creator, json };
  }, [creator, json]);
}
