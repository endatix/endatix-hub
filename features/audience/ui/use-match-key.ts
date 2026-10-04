"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  isAudienceIdentifierKind,
  type AudienceIdentifierKind,
} from "@/lib/endatix-api/audience/types";
import { runUpdateMatchKey } from "./audience-runs";

export function useMatchKey(
  identifierKind: AudienceIdentifierKind,
  hasMembers: boolean,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string): void {
    if (!isAudienceIdentifierKind(value) || value === identifierKind) return;
    startTransition(async () => {
      if (await runUpdateMatchKey(value)) {
        router.refresh();
      }
    });
  }

  return { pending: pending || hasMembers, change, identifierKind };
}
