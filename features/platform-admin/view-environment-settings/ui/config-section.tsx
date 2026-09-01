"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}

/**
 * A configuration group: card on the page canvas, rows on a nested surface.
 * Depth comes from the tonal shift between the two, not from divider lines.
 */
export function ConfigSection({
  title,
  description,
  icon: Icon,
  children,
}: Readonly<ConfigSectionProps>) {
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-on-surface-variant" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 rounded-lg bg-muted/40 p-4">{children}</dl>
      </CardContent>
    </Card>
  );
}
