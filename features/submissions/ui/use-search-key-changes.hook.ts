"use client";

import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  addSearchKeyAction,
  removeSearchKeyAction,
} from "@/features/submissions/search-keys.action";
import type { SearchKeyChange } from "@/features/submissions/column-search";
import { searchKeyFailedMessage, searchKeyOutcome } from "./search-key-outcome";

const ACTIONS = {
  add: addSearchKeyAction,
  remove: removeSearchKeyAction,
} as const;

export type SearchKeyTarget = { key: string; title: string };

export type SearchKeyChanges = ReturnType<typeof useSearchKeyChanges>;

export function useSearchKeyChanges(formId: string) {
  const { isPending, startTransition, refresh } = useRefreshColumns();
  const change = (kind: SearchKeyChange, target: SearchKeyTarget) => {
    startTransition(async () => {
      try {
        const result = await ACTIONS[kind](formId, target.key);
        const outcome = searchKeyOutcome(kind, target.title, result);
        toast[outcome.variant](outcome.message);
      } catch {
        toast.error(searchKeyFailedMessage(target.title));
      }
    });
  };

  return { isPending, change, refresh };
}

export function useRefreshColumns() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  return { isPending, startTransition, refresh };
}
