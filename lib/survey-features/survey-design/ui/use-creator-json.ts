"use client";

import { useEffect, useRef } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import { shouldApplyCreatorJson } from "../use-cases/should-apply-creator-json";

/** Loads a saved canvas snapshot into the Creator without clobbering live edits. */
export function useCreatorJson(
  creator: SurveyCreatorModel | null,
  json: object | null,
) {
  const appliedToRef = useRef<SurveyCreatorModel | null>(null);
  const lastAppliedJsonRef = useRef<object | null>(null);

  useEffect(() => {
    if (
      !creator ||
      !json ||
      !shouldApplyCreatorJson(
        creator,
        json,
        appliedToRef.current,
        lastAppliedJsonRef.current,
      )
    ) {
      return;
    }

    creator.JSON = json;
    appliedToRef.current = creator;
    lastAppliedJsonRef.current = json;
  }, [creator, json]);
}
