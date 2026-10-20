"use client";

import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  addSearchKeyAction,
  removeSearchKeyAction,
} from "@/features/submissions/choose-filterable-questions/choose-filterable-questions.action";
import type { SearchKeyChange } from "@/features/submissions/column-search";
import { searchKeyOutcome } from "./search-key-outcome";

const ACTIONS = {
  add: addSearchKeyAction,
  remove: removeSearchKeyAction,
} as const;

/** A column to change, by key, with the title the toast names. */
export type SearchKeyTarget = { key: string; title: string };

export type SearchKeyChanges = ReturnType<typeof useSearchKeyChanges>;

/**
 * Adds or removes a column's search key and says how it went. The action
 * revalidates the grid and the settings, so the page reads the columns again.
 */
export function useSearchKeyChanges(formId: string) {
  const { isPending, startTransition, refresh } = useRefreshColumns();
  const change = (kind: SearchKeyChange, target: SearchKeyTarget) => {
    startTransition(async () => {
      const result = await ACTIONS[kind](formId, target.key);
      const outcome = searchKeyOutcome(kind, target.title, result);
      toast[outcome.variant](outcome.message);
    });
  };

  return { isPending, change, refresh };
}

/**
 * Reads the columns again on request: the Hub has no push channel, so this
 * is how a preparing column is seen to turn ready. No polling.
 */
export function useRefreshColumns() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  return { isPending, startTransition, refresh };
}
