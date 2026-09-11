"use client";

import { useEffect, useRef } from "react";
import { Helpers } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";

/**
 * Definition comparison, not answer comparison: survey-core's comparator defaults
 * fold case and trim strings, which would hide a real title edit. Numbers stay
 * untyped so `"5"` is not the same definition as `5`.
 */
const SAME_DEFINITION = {
  ignoreOrder: false,
  caseSensitive: true,
  trimStrings: false,
  doNotConvertNumbers: true,
} as const;

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const appliedToRef = useRef<SurveyCreatorModel | null>(null);
  const lastAppliedJsonRef = useRef<object | null>(null);

  useEffect(() => {
    if (!creator || !json) {
      return;
    }

    // Reassigning resets undo history and the selected element, so skip a snapshot
    // we already applied (Server Component refetch) or one the canvas already holds
    // (`revalidatePath` after a save hands back exactly what the user just saved).
    const isSameDefinition = (applied: object | null) =>
      Helpers.checkIfValuesEqual(applied, json, SAME_DEFINITION);

    if (
      appliedToRef.current === creator &&
      (isSameDefinition(lastAppliedJsonRef.current) ||
        isSameDefinition(creator.JSON))
    ) {
      return;
    }

    creator.JSON = json;
    appliedToRef.current = creator;
    lastAppliedJsonRef.current = json;
  }, [creator, json]);
}
