"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ShareLinkRowHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function ShareLinkRowHeader({
  icon: Icon,
  title,
  description,
  className,
}: Readonly<ShareLinkRowHeaderProps>) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
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
  );
}

interface ShareLinkRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  className?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export function ShareLinkRow({
  icon,
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
      <ShareLinkRowHeader icon={icon} title={title} description={description} />

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
