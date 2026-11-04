"use client";

import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LinkTab = {
  id: string;
  label: string;
  href: Route;
  /** A count shown after the label, e.g. the people on an audience. */
  count?: number;
};

type LinkTabsProps = {
  /** Accessible name of the `nav` ("Audience view"). */
  label: string;
  tabs: readonly LinkTab[];
  activeId?: string;
  className?: string;
};

const TAB_CLASS =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm";

function TabCount({ count }: Readonly<{ count?: number }>) {
  if (count === undefined) return null;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {count.toLocaleString()}
    </span>
  );
}

function LinkTabItem({
  tab,
  isActive,
}: Readonly<{ tab: LinkTab; isActive: boolean }>) {
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={isActive ? "page" : undefined}
        className={TAB_CLASS}
      >
        {tab.label} <TabCount count={tab.count} />
      </Link>
    </li>
  );
}

/**
 * A segmented switch between the views of one page (People / Properties). Each view is a URL,
 * so it can be opened in a new tab, shared and kept on reload. Moving between pages of a record
 * is the header switcher's job (DESIGN.md §6 Navigation), not this control's.
 */
export function LinkTabs({
  label,
  tabs,
  activeId,
  className,
}: Readonly<LinkTabsProps>) {
  const nav = cn("max-w-full overflow-x-auto overflow-y-hidden", className);
  return (
    <nav aria-label={label} className={nav}>
      <ul className="inline-flex w-max items-center gap-0.5 rounded-lg bg-muted p-[3px]">
        {tabs.map((tab) => (
          <LinkTabItem key={tab.id} tab={tab} isActive={tab.id === activeId} />
        ))}
      </ul>
    </nav>
  );
}
