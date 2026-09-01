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

export function ConfigSection({
  title,
  description,
  icon: Icon,
  children,
}: Readonly<ConfigSectionProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
