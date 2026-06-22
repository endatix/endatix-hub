"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CreateFormOptionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function CreateFormOptionCard({
  title,
  description,
  icon: Icon,
  onClick,
  isSelected,
  disabled,
}: Readonly<CreateFormOptionCardProps>) {
  return (
    <Card
      onClick={disabled ? undefined : onClick}
      className={cn(
        "focus:outline-primary-500 flex flex-col overflow-hidden py-0 hover:border-primary hover:bg-accent focus:outline focus:outline-2",
        !disabled && "cursor-pointer",
        isSelected && "border-primary bg-accent",
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:bg-background",
      )}
    >
      <CardHeader className="flex flex-grow flex-row items-start justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-lg leading-tight font-medium">
          {title}
        </CardTitle>
        <Icon className="ml-4 h-8 w-8 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="mt-auto rounded-b-lg border-t bg-muted p-4">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
