"use client";

import {
  isAudienceIdentifierKind,
  type AudienceIdentifierKind,
} from "@/lib/endatix-api/audience/types";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { updateAudienceSettingsAction } from "./update-audience-settings.action";

export type MatchKeyState = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  /** From the API: someone is on a form's audience somewhere in the tenant. */
  isLocked: boolean;
  canManage: boolean;
};

const MATCH_KEY_HINTS = Object.freeze({
  locked:
    "Locked while any form in your organization has people on its audience. Remove them to change it.",
  noPermission: "Only people who manage organization settings can change it.",
  open: "Choose it before adding people. It locks once anyone is added to any form.",
} as const);

/** The one line under the select: why it is disabled, or when it will lock. */
export function matchKeyHint({
  isLocked,
  canManage,
}: Pick<MatchKeyState, "isLocked" | "canManage">): string {
  if (isLocked) return MATCH_KEY_HINTS.locked;
  return canManage ? MATCH_KEY_HINTS.open : MATCH_KEY_HINTS.noPermission;
}

function saveMatchKey(
  state: MatchKeyState,
  run: ReturnType<typeof useAudienceMutation>["run"],
) {
  return (value: string) => {
    if (!isAudienceIdentifierKind(value) || value === state.identifierKind) {
      return;
    }
    run({
      action: () => updateAudienceSettingsAction(state.formId, value),
      successMessage: "Match key updated",
    });
  };
}

export function useMatchKey(state: MatchKeyState) {
  const mutation = useAudienceMutation();
  return {
    disabled: mutation.pending || state.isLocked || !state.canManage,
    error: mutation.error,
    change: saveMatchKey(state, mutation.run),
    hint: matchKeyHint(state),
  };
}
