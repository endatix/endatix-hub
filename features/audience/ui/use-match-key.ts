"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { runUpdateMatchKey } from "./audience-runs";

export function useMatchKey(
  identifierKind: AudienceIdentifierKind,
  hasMembers: boolean,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(value: string): void {
    startTransition(async () => {
      if (await runUpdateMatchKey(value as AudienceIdentifierKind)) {
        router.refresh();
      }
    });
  }

  return { pending: pending || hasMembers, change, identifierKind };
}
