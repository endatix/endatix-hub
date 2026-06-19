"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
}

export function TableSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
}: Readonly<TableSearchInputProps>) {
  return (
    <div className={cn("relative min-w-0 flex-1 lg:max-w-sm", className)}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("pl-9 text-sm", inputClassName)}
      />
    </div>
  );
}
