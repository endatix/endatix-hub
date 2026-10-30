"use client";

import { useState } from "react";

/**
 * Participants ticked in the list, by membership id. The ticks outlive a page or filter change,
 * so a selection can span pages.
 */
export function useParticipantSelection() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const setSelected = (changed: readonly string[], selected: boolean) =>
    setIds((current) => {
      const next = new Set(current);
      for (const id of changed) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  return {
    ids: [...ids],
    isSelected: (id: string) => ids.has(id),
    setSelected,
    clear: () => setIds(new Set()),
  };
}

export type ParticipantSelection = ReturnType<typeof useParticipantSelection>;
