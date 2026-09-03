"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Status or affordance pinned to the right of the section title. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled group of controls inside an overlay — `ConfigSection` on a nested
 * surface rather than a Card, because a panel is already raised (DESIGN.md §4).
 */
export function PanelSection({
  icon: Icon,
  title,
  description,
  aside,
  children,
  className,
}: Readonly<PanelSectionProps>) {
  return (
    <section
      className={cn(
        "grid content-start gap-4 rounded-lg bg-surface-container-low p-4",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon
              aria-hidden="true"
              className="size-4 shrink-0 text-on-surface-variant"
            />
            {title}
          </h3>
          {description && (
            <p className="text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  );
}
