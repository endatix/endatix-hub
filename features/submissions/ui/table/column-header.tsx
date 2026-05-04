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
  Check,
  ChevronsUpDown,
  EyeOff,
  Filter,
  ListFilter,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useColumnVisibility } from "./column-visibility-context";
import type { DateFilterValue } from "./date-filter-types";

interface DateFilterConfig {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

interface DateFilterControlsProps {
  idPrefix: string;
  value: DateFilterValue;
  onApply: (value: DateFilterValue) => void;
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
    return <div className={cn("cursor-default", className)}>{title}</div>;
  }

  let SortIcon: typeof ChevronsUpDown | null = null;
  if (isSorted === "asc") {
    SortIcon = ArrowUp;
  } else if (isSorted === "desc") {
    SortIcon = ArrowDown;
  }

  const handleSortCycle = () => {
    if (isSorted === "asc") {
      column.toggleSorting(true);
      return;
    }

    if (isSorted === "desc") {
      column.clearSorting();
      return;
    }

    column.toggleSorting(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        onClick={handleSortCycle}
      >
        <span className="truncate">{title}</span>
        <span
          aria-hidden="true"
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        >
          {SortIcon ? <SortIcon className="h-3.5 w-3.5" /> : null}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 data-[state=open]:bg-accent"
            aria-label={`${title} column menu`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {hasDateFilter ? (
              <Filter className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ListFilter className="h-3.5 w-3.5" />
            )}
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
          {isSorted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.clearSorting()}>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                Clear sorting
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
                <DateFilterControls
                  idPrefix={column.id}
                  value={dateFilter.value}
                  onApply={dateFilter.onChange}
                />
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

export function DateFilterControls({
  idPrefix,
  value,
  onApply,
}: DateFilterControlsProps) {
  const [draftDateFilter, setDraftDateFilter] =
    useState<DateFilterValue>(value);
  const hasActiveFilter = Boolean(value.from || value.to);

  useEffect(() => {
    setDraftDateFilter(value);
  }, [value]);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-from`} className="text-xs">
          From
        </Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={draftDateFilter.from ?? ""}
          onChange={(event) =>
            setDraftDateFilter({
              ...draftDateFilter,
              from: event.target.value || undefined,
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-to`} className="text-xs">
          To
        </Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={draftDateFilter.to ?? ""}
          onChange={(event) =>
            setDraftDateFilter({
              ...draftDateFilter,
              to: event.target.value || undefined,
            })
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onApply(draftDateFilter)}
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={
            !hasActiveFilter && !draftDateFilter.from && !draftDateFilter.to
          }
          onClick={() => {
            setDraftDateFilter({});
            onApply({});
          }}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </>
  );
}
