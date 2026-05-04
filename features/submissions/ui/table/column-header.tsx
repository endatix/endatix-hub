import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Column, SortDirection } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
  Filter,
  X,
} from "lucide-react";
import { useColumnVisibility } from "./column-visibility-context";
import type { DateFilterValue } from "./date-filter-types";

interface DateFilterConfig {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

interface ColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  visible?: boolean;
  isSorted?: false | SortDirection;
  dateFilter?: DateFilterConfig;
}

export function ColumnHeader<TData, TValue>({
  column,
  title,
  visible = true,
  className,
  isSorted,
  dateFilter,
}: ColumnHeaderProps<TData, TValue>) {
  const { toggleColumnVisibility } = useColumnVisibility();
  const hasDateFilter = Boolean(dateFilter?.value.from || dateFilter?.value.to);

  if (!visible) {
    return <span className="sr-only">{title}</span>;
  }

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  let SortIcon: typeof ChevronsUpDown = ChevronsUpDown;
  if (isSorted === "asc") {
    SortIcon = ArrowUp;
  } else if (isSorted === "desc") {
    SortIcon = ArrowDown;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {hasDateFilter ? (
              <Filter className="h-3.5 w-3.5 text-primary" />
            ) : null}
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
          {dateFilter && (
            <>
              <DropdownMenuSeparator />
              <div
                className="w-56 space-y-3 p-2"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`${column.id}-from`} className="text-xs">
                    From
                  </Label>
                  <Input
                    id={`${column.id}-from`}
                    type="date"
                    value={dateFilter.value.from ?? ""}
                    onChange={(event) =>
                      dateFilter.onChange({
                        ...dateFilter.value,
                        from: event.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${column.id}-to`} className="text-xs">
                    To
                  </Label>
                  <Input
                    id={`${column.id}-to`}
                    type="date"
                    value={dateFilter.value.to ?? ""}
                    onChange={(event) =>
                      dateFilter.onChange({
                        ...dateFilter.value,
                        to: event.target.value || undefined,
                      })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  disabled={!hasDateFilter}
                  onClick={() => dateFilter.onChange({})}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filter
                </Button>
              </div>
            </>
          )}
          {column.id !== "actions" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => toggleColumnVisibility(column.id!)}
              >
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
