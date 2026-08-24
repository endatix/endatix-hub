import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DataTableEmptyProps {
  children: ReactNode;
  className?: string;
}

export function DataTableEmpty({
  children,
  className,
}: Readonly<DataTableEmptyProps>) {
  return (
    <div
      className={cn(
        "flex h-24 items-center justify-center px-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
