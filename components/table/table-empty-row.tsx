"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface TableEmptyRowProps {
  colSpan: number;
  message: string;
  className?: string;
}

export function TableEmptyRow({
  colSpan,
  message,
  className,
}: Readonly<TableEmptyRowProps>) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn("h-24 text-center text-muted-foreground", className)}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}
