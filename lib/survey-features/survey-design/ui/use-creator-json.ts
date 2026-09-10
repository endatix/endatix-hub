"use client";

import { useEffect, useRef } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import { shouldApplyCreatorJson } from "../use-cases/should-apply-creator-json";

/**
 * Assigns survey JSON when its content changes, not merely its object
 * identity. A Server Component refetch of the same snapshot must not
 * replace in-memory canvas edits; a distinct snapshot (AI chat) must.
 */
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

    if (
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
