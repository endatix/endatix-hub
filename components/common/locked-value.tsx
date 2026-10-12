import type { ReactNode } from "react";
import { StatusBadge } from "./status-badge";

/**
 * A value this overlay can never change, with the lock beside it. Use it as a `SummaryRow` value,
 * not a disabled input (DESIGN.md §6 Controls & consequences).
 */
export function LockedValue({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      {children}
      <StatusBadge tone="off" label="Locked" />
    </span>
  );
}
