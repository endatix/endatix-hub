"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ShareLinkRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  className?: string;
}

export function ShareLinkRow({
  icon: Icon,
  title,
  description,
  value,
  copyLabel,
  className,
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

      <div className="relative">
        <Input
          readOnly
          value={value}
          className="bg-surface-container-lowest pr-10 font-mono text-xs"
        />
        <CopyToClipboard copyValue={value} label={copyLabel} />
      </div>
    </section>
  );
}
