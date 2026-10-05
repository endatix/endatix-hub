"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  isAudienceIdentifierKind,
  type AudienceIdentifierKind,
} from "@/lib/endatix-api/audience/types";
import { runUpdateMatchKey } from "../audience-runs";

export type MatchKeyState = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  /** From the API: someone is on a form's audience somewhere in the tenant. */
  isLocked: boolean;
  canManage: boolean;
};

export function useMatchKey({
  formId,
  identifierKind,
  isLocked,
  canManage,
}: MatchKeyState) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string): void {
    if (!isAudienceIdentifierKind(value) || value === identifierKind) return;
    startTransition(async () => {
      if (await runUpdateMatchKey(formId, value)) {
        router.refresh();
      }
    });
  }

  return {
    disabled: pending || isLocked || !canManage,
    change,
    identifierKind,
  };
}
