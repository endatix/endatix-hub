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

type Applied = { creator: SurveyCreatorModel; json: object; definitionId?: string };

function alreadyLoaded(next: Applied, last: Applied | null) {
  if (last?.creator !== next.creator || last.definitionId !== next.definitionId) return false;
  return isSameDefinition(last.json, next.json) || isSameDefinition(next.creator.JSON, next.json);
}

/** Give Creator its own copy: it mutates nested locale objects during editing.
 * The fetched definition remains the source for merging and Save readback. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
  definitionId?: string,
) {
  const last = useRef<Applied | null>(null);
  useEffect(() => () => {
    if (creator) unbindConversionSource(creator);
    last.current = null;
  }, [creator]);

  useEffect(() => {
    if (!creator || !json) return;
    const next = { creator, json, definitionId };
    // Saving an active definition with submissions creates a new version. Its echo must not reset a newer edit.
    if (conversionSession(creator)?.consumeSaveEcho(json)) { last.current = next; return; }
    if (alreadyLoaded(next, last.current)) return;
    creator.JSON = structuredClone(json);
    bindConversionSource(creator, json);
    last.current = next;
  }, [creator, json, definitionId]);
}
