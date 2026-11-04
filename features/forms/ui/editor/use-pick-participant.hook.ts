"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import type {
  FoundParticipant,
  ParticipantFinder,
  PreviewAs,
} from "@/lib/personalization/authoring";
import { Result, toActionFailure } from "@/lib/result";

const FAILED = "Failed to load the participant's values.";

/**
 * Reads the picked participant's values, then hands them to `onPicked`. Unmounting (the dialog
 * closed) while they load cancels the pick.
 */
export function usePickParticipant(
  finder: ParticipantFinder,
  onPicked: PreviewAs,
) {
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const mounted = useMounted();
  const onPick = async ({ audienceMemberId, isTest }: FoundParticipant) => {
    setPickError(null);
    setPicking(true);
    const preset = await readPreset(finder, audienceMemberId);
    if (!mounted.current) return;
    setPicking(false);
    if (Result.isError(preset)) setPickError(preset.message);
    else onPicked(preset.value, isTest);
  };
  const clearPickError = useCallback(() => setPickError(null), []);
  return { onPick, picking, pickError, clearPickError };
}

function readPreset(
  finder: ParticipantFinder,
  audienceMemberId: string,
): Promise<Result<AudienceVariablePreset>> {
  return finder
    .preset(audienceMemberId)
    .catch(toActionFailure<AudienceVariablePreset>(FAILED));
}

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
