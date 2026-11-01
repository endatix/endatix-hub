"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "@/components/common/status-badge";

/** The Test badge, in the tone of test submissions. */
export const TEST_BADGE = <StatusBadge tone="attention" label="Test" />;

/** `children` alone, or followed by the Test badge when the row is a test one. */
export function WithTestBadge({
  isTest,
  children,
}: Readonly<{ isTest: boolean; children: ReactNode }>) {
  if (!isTest) return children;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {children}
      {TEST_BADGE}
    </span>
  );
}
