"use client";

import { useState } from "react";

function withChanged(
  current: ReadonlySet<string>,
  changed: readonly string[],
  selected: boolean,
): ReadonlySet<string> {
  const next = new Set(current);
  for (const id of changed) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return next;
}

/**
 * Participants ticked in the list, by membership id. The ticks outlive a page or filter change,
 * so a selection can span pages.
 */
export function useParticipantSelection() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const setSelected = (changed: readonly string[], selected: boolean) =>
    setIds((current) => withChanged(current, changed, selected));
  return {
    ids: [...ids],
    isSelected: (id: string) => ids.has(id),
    setSelected,
    /** Drops one participant's tick, such as after they are removed. */
    untick: ({ membershipId }: { membershipId: string }) =>
      setSelected([membershipId], false),
    clear: () => setIds(new Set()),
  };
}

export type ParticipantSelection = ReturnType<typeof useParticipantSelection>;
