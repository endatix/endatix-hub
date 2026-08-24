"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTableReturnHref } from "@/lib/list-page/table-return-to";

interface BackToTableButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "asChild" | "children"
> {
  /** Identifies the list this button returns to, e.g. `"data-lists"`, `"submissions"`. */
  tableKey: string;
  /** Scopes the remembered query when the list is per-parent-entity (e.g. a formId). */
  scopeId?: string;
  /** Bare list path used when nothing is remembered (or storage is unavailable). */
  fallbackHref: string;
  /**
   * Re-parses a query string through the list's own whitelist (same
   * `parse*ListParams` + `serialize*ListSearchParams` round-trip the list
   * page uses). Must be a stable reference (module-level function or
   * `useCallback`) — it re-runs on every render this button's inputs change.
   */
  parse: (query: string) => string;
  /** Builds the full href from an already-validated query string. */
  buildHref: (query: string) => string;
  text?: string;
}

/**
 * "Back to list" control that restores the list's last remembered
 * paging/filters via session-scoped storage (see `lib/list-page/table-return-to`),
 * falling back to `fallbackHref` on first visit, private browsing, or a new tab.
 */
export function BackToTableButton({
  tableKey,
  scopeId,
  fallbackHref,
  parse,
  buildHref,
  text = "Back",
  variant = "outline",
  ...props
}: Readonly<BackToTableButtonProps>) {
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    setHref(
      getTableReturnHref(tableKey, fallbackHref, parse, buildHref, scopeId),
    );
  }, [tableKey, scopeId, fallbackHref, parse, buildHref]);

  return (
    <Button variant={variant} asChild {...props}>
      <Link href={href as Route} className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {text}
      </Link>
    </Button>
  );
}
