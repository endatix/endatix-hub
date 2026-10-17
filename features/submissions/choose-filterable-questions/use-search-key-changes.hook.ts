"use client";

import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  addSearchKeyAction,
  removeSearchKeyAction,
} from "./choose-filterable-questions.action";
import type { SearchKeyChange } from "./filterable-questions";
import { searchKeyOutcome } from "./search-key-outcome";

const ACTIONS = {
  add: addSearchKeyAction,
  remove: removeSearchKeyAction,
} as const;

/** A column to change, by key, with the title the toast names. */
export type SearchKeyTarget = { key: string; title: string };

export type SearchKeyChanges = ReturnType<typeof useSearchKeyChanges>;

/**
 * Adds or removes a column's search key, says how it went, and reads the
 * columns again. There is no polling: `refresh` reads them on request.
 */
export function useSearchKeyChanges(formId: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const change = (kind: SearchKeyChange, target: SearchKeyTarget) => {
    startTransition(async () => {
      const result = await ACTIONS[kind](formId, target.key);
      const outcome = searchKeyOutcome(kind, target.title, result);
      toast[outcome.variant](outcome.message);
      if (outcome.refresh) router.refresh();
    });
  };
  const refresh = () => startTransition(() => router.refresh());

  return { isPending, change, refresh };
}
