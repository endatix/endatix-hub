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
import { useEffect, useState, type ReactNode } from "react";
import { useColumnVisibility } from "./column-visibility-context";
import type { DateFilterValue } from "./date-filter-types";

interface DateFilterConfig {
  readonly value: DateFilterValue;
  readonly onChange: (value: DateFilterValue) => void;
}

interface TextFilterConfig {
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

interface DateFilterControlsProps {
  readonly idPrefix: string;
  readonly value: DateFilterValue;
  readonly onApply: (value: DateFilterValue) => void;
}

interface TextFilterControlsProps {
  readonly idPrefix: string;
  readonly value: string;
  readonly placeholder: string;
  readonly onApply: (value: string) => void;
}

interface ColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  readonly column: Column<TData, TValue>;
  readonly title: string;
  readonly visible?: boolean;
  readonly isSorted?: false | SortDirection;
  readonly dateFilter?: DateFilterConfig;
  readonly textFilter?: TextFilterConfig;
  /** Shrink header chrome (padding, menu button) for dense columns. */
  readonly density?: "default" | "compact";
  /** Optional visual title (e.g. icon); `title` remains the accessible name. */
  readonly titleContent?: ReactNode;
}

export function ColumnHeader<TData, TValue>({
  column,
  title,
  visible = true,
  className,
  isSorted,
  dateFilter,
  textFilter,
  density = "default",
  titleContent,
}: ColumnHeaderProps<TData, TValue>) {
  const { toggleColumnVisibility } = useColumnVisibility();
  const canSort = column.getCanSort();
  const hasDateFilter = Boolean(dateFilter?.value.from || dateFilter?.value.to);
  const hasTextFilter = Boolean(textFilter?.value.trim());
  const hasActiveFilter = hasDateFilter || hasTextFilter;
  const isCompact = density === "compact";

  if (!visible) {
    return <span className="sr-only">{title}</span>;
  }

  if (!canSort && !dateFilter && !textFilter) {
    return (
      <div className={cn("cursor-default", className)}>
        {titleContent ?? title}
      </div>
    );
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

  const titleLabel = titleContent ?? <span className="truncate">{title}</span>;

  return (
    <div
      className={cn(
        "flex items-center",
        isCompact ? "gap-0.5" : "gap-2",
        className,
      )}
    >
      {canSort ? (
        <button
          type="button"
          className={cn(
            "flex cursor-pointer items-center rounded-md text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            isCompact ? "h-7 gap-1 px-1" : "h-8 min-w-0 flex-1 gap-1.5 px-2",
          )}
          onClick={handleSortCycle}
          aria-label={title}
        >
          {titleLabel}
          <span
            aria-hidden="true"
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
          >
            {SortIcon ? <SortIcon className="h-3.5 w-3.5" /> : null}
          </span>
        </button>
      ) : (
        <div
          className={cn(
            "flex items-center text-sm font-medium",
            isCompact ? "h-7 px-1" : "h-8 min-w-0 flex-1 px-2",
          )}
        >
          {titleLabel}
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "data-[state=open]:bg-accent",
              isCompact ? "h-7 w-7" : "h-8 w-8",
            )}
            aria-label={`${title} column menu`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {hasActiveFilter ? (
              <Filter className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ListFilter className="h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canSort && (
            <>
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
            </>
          )}
          {dateFilter && (
            <>
              {canSort && <DropdownMenuSeparator />}
              <div className="w-56 space-y-3 p-2">
                <DateFilterControls
                  idPrefix={column.id}
                  value={dateFilter.value}
                  onApply={dateFilter.onChange}
                />
              </div>
            </>
          )}
          {textFilter && (
            <>
              {(canSort || dateFilter) && <DropdownMenuSeparator />}
              <div className="w-56 space-y-3 p-2">
                <TextFilterControls
                  idPrefix={column.id}
                  value={textFilter.value}
                  placeholder={textFilter.placeholder}
                  onApply={textFilter.onChange}
                />
              </div>
            </>
          )}
          {column.id !== "actions" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => toggleColumnVisibility(column.id)}
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

export function TextFilterControls({
  idPrefix,
  value,
  placeholder,
  onApply,
}: TextFilterControlsProps) {
  const [draftValue, setDraftValue] = useState(value);
  const hasActiveFilter = Boolean(value.trim());

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-filter`} className="text-xs">
          Filter
        </Label>
        <Input
          id={`${idPrefix}-filter`}
          value={draftValue}
          placeholder={placeholder}
          onChange={(event) => setDraftValue(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onApply(draftValue.trim())}
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={!hasActiveFilter && !draftValue.trim()}
          onClick={() => {
            setDraftValue("");
            onApply("");
          }}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </>
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
