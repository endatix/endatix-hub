"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ShareLinkRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  className?: string;
  /** Rendered beside the copy button - a native share, a regenerate, nothing. */
  actions?: ReactNode;
  /** Rendered under the input, e.g. when this link expires. */
  footer?: ReactNode;
}

export function ShareLinkRow({
  icon: Icon,
  title,
  description,
  value,
  copyLabel,
  className,
  actions,
  footer,
}: Readonly<ShareLinkRowProps>) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg bg-surface-container-low p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:size-4">
          <Icon />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {/* Stacks under sm so a long URL never widens the dialog. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            readOnly
            value={value}
            className="truncate bg-surface-container-lowest pr-10 font-mono text-xs"
          />
          <CopyToClipboard copyValue={value} label={copyLabel} />
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
    </section>
  );
}
