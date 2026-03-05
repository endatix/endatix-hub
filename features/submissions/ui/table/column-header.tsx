import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Column, SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import { useColumnVisibility } from "./column-visibility-context";

interface ColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  visible?: boolean;
  isSorted?: false | SortDirection;
}

export function ColumnHeader<TData, TValue>({
  column,
  title,
  visible = true,
  className,
  isSorted,
}: ColumnHeaderProps<TData, TValue>) {
  const { toggleColumnVisibility } = useColumnVisibility();

  if (!visible) {
    return <span className="sr-only">{title}</span>;
  }

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  let SortIcon: typeof ChevronsUpDown = ChevronsUpDown;
  if (isSorted === "asc") {
    SortIcon = ArrowUp;
  }
  else if (isSorted === "desc") {
    SortIcon = ArrowDown;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="data-[state=open]:bg-accent -ml-3 h-8"
          >
            <span>{title}</span>
            <SortIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          {column.getIsSorted() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.clearSorting()}>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                Clear Sort
              </DropdownMenuItem>
            </>
          )}
          {column.id !== "actions" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleColumnVisibility(column.id!)}>
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
