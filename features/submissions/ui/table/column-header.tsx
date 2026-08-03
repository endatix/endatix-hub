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
  /**
   * `center` keeps the title fixed (e.g. Complete icon) and overlays sort/filter
   * chrome so hover does not shift alignment vs cell content.
   */
  readonly align?: "start" | "center";
}

/** Hover-reveal chrome on md+; always visible when active or below md. */
export function getColumnHeaderChromeClassName(forceVisible: boolean): string {
  if (forceVisible) {
    return "opacity-100";
  }

  return [
    "opacity-100",
    "md:opacity-0 md:pointer-events-none",
    "md:group-hover:opacity-100 md:group-hover:pointer-events-auto",
    "md:focus-within:opacity-100 md:focus-within:pointer-events-auto",
  ].join(" ");
}

/**
 * Inverse of chrome for center-aligned headers: hide the title while sort/filter
 * are shown so they never stack on top of each other in a narrow column.
 */
export function getColumnHeaderTitleSwapClassName(
  forceVisible: boolean,
): string {
  if (forceVisible) {
    return "opacity-0 pointer-events-none";
  }

  return [
    "opacity-0 pointer-events-none",
    "md:opacity-100 md:pointer-events-auto",
    "md:group-hover:opacity-0 md:group-hover:pointer-events-none",
    "md:focus-within:opacity-0 md:focus-within:pointer-events-none",
  ].join(" ");
}

function getSortIcon(isSorted: false | SortDirection | undefined) {
  if (isSorted === "asc") {
    return ArrowUp;
  }

  if (isSorted === "desc") {
    return ArrowDown;
  }

  return null;
}

function cycleColumnSort<TData, TValue>(
  column: Column<TData, TValue>,
  isSorted: false | SortDirection | undefined,
): void {
  if (isSorted === "asc") {
    column.toggleSorting(true);
    return;
  }

  if (isSorted === "desc") {
    column.clearSorting();
    return;
  }

  column.toggleSorting(false);
}

function SortIndicator({
  isSorted,
  chromeClassName,
}: {
  readonly isSorted: false | SortDirection | undefined;
  readonly chromeClassName?: string;
}) {
  const SortIcon = getSortIcon(isSorted);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-opacity",
        chromeClassName,
      )}
    >
      {SortIcon ? (
        <SortIcon className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
      )}
    </span>
  );
}

function ColumnHeaderMenu<TData, TValue>({
  column,
  title,
  canSort,
  isSorted,
  dateFilter,
  textFilter,
  hasActiveFilter,
  isCompact,
  chromeClassName,
  contentAlign,
  onHideColumn,
}: {
  readonly column: Column<TData, TValue>;
  readonly title: string;
  readonly canSort: boolean;
  readonly isSorted: false | SortDirection | undefined;
  readonly dateFilter?: DateFilterConfig;
  readonly textFilter?: TextFilterConfig;
  readonly hasActiveFilter: boolean;
  readonly isCompact: boolean;
  readonly chromeClassName?: string;
  readonly contentAlign: "start" | "end";
  readonly onHideColumn: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "transition-opacity data-[state=open]:bg-accent data-[state=open]:opacity-100",
            isCompact ? "h-7 w-7" : "h-8 w-8",
            chromeClassName,
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
      <DropdownMenuContent align={contentAlign}>
        {canSort ? (
          <>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/70" />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
              Desc
            </DropdownMenuItem>
            {isSorted ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                  Clear sorting
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : null}
        {dateFilter ? (
          <>
            {canSort ? <DropdownMenuSeparator /> : null}
            <div className="w-56 space-y-3 p-2">
              <DateFilterControls
                idPrefix={column.id}
                value={dateFilter.value}
                onApply={dateFilter.onChange}
              />
            </div>
          </>
        ) : null}
        {textFilter ? (
          <>
            {canSort || dateFilter ? <DropdownMenuSeparator /> : null}
            <div className="w-56 space-y-3 p-2">
              <TextFilterControls
                idPrefix={column.id}
                value={textFilter.value}
                placeholder={textFilter.placeholder}
                onApply={textFilter.onChange}
              />
            </div>
          </>
        ) : null}
        {column.id !== "actions" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onHideColumn}>
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CenterAlignedColumnHeader<TData, TValue>({
  column,
  title,
  titleLabel,
  className,
  canSort,
  isSorted,
  dateFilter,
  textFilter,
  hasActiveFilter,
  isCompact,
  chromeClassName,
  titleSwapClassName,
  onHideColumn,
}: {
  readonly column: Column<TData, TValue>;
  readonly title: string;
  readonly titleLabel: ReactNode;
  readonly className?: string;
  readonly canSort: boolean;
  readonly isSorted: false | SortDirection | undefined;
  readonly dateFilter?: DateFilterConfig;
  readonly textFilter?: TextFilterConfig;
  readonly hasActiveFilter: boolean;
  readonly isCompact: boolean;
  readonly chromeClassName: string;
  readonly titleSwapClassName: string;
  readonly onHideColumn: () => void;
}) {
  const handleSortCycle = () => cycleColumnSort(column, isSorted);
  const sizeClassName = isCompact ? "h-7 w-7" : "h-8 w-8";
  const canFilter = Boolean(dateFilter || textFilter);
  const showColumnMenu = canSort || canFilter;

  return (
    <div
      className={cn(
        "group relative flex w-full items-center justify-center",
        isCompact ? "h-7" : "h-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center transition-opacity",
          sizeClassName,
          titleSwapClassName,
        )}
        aria-hidden={canSort ? true : undefined}
      >
        {titleLabel}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          isCompact ? "gap-0.5" : "gap-1",
          chromeClassName,
        )}
      >
        {canSort ? (
          <button
            type="button"
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
              sizeClassName,
            )}
            onClick={handleSortCycle}
            aria-label={`Sort ${title}`}
          >
            <SortIndicator isSorted={isSorted} />
          </button>
        ) : null}
        {showColumnMenu ? (
          <ColumnHeaderMenu
            column={column}
            title={title}
            canSort={canSort}
            isSorted={isSorted}
            dateFilter={dateFilter}
            textFilter={textFilter}
            hasActiveFilter={hasActiveFilter}
            isCompact={isCompact}
            contentAlign="end"
            onHideColumn={onHideColumn}
          />
        ) : null}
      </div>
    </div>
  );
}

function StartAlignedColumnHeader<TData, TValue>({
  column,
  title,
  titleLabel,
  className,
  canSort,
  isSorted,
  dateFilter,
  textFilter,
  hasActiveFilter,
  isCompact,
  chromeClassName,
  onHideColumn,
}: {
  readonly column: Column<TData, TValue>;
  readonly title: string;
  readonly titleLabel: ReactNode;
  readonly className?: string;
  readonly canSort: boolean;
  readonly isSorted: false | SortDirection | undefined;
  readonly dateFilter?: DateFilterConfig;
  readonly textFilter?: TextFilterConfig;
  readonly hasActiveFilter: boolean;
  readonly isCompact: boolean;
  readonly chromeClassName: string;
  readonly onHideColumn: () => void;
}) {
  const canFilter = Boolean(dateFilter || textFilter);
  const showColumnMenu = canSort || canFilter;

  return (
    <div
      className={cn(
        "group flex items-center",
        isCompact ? "gap-0.5" : "gap-2",
        className,
      )}
    >
      {canSort ? (
        <button
          type="button"
          className={cn(
            "flex cursor-pointer items-center rounded-md text-left hover:bg-accent hover:text-accent-foreground",
            isCompact ? "h-7 gap-1 px-1" : "h-8 min-w-0 flex-1 gap-1.5 px-2",
          )}
          onClick={() => cycleColumnSort(column, isSorted)}
          aria-label={title}
        >
          {titleLabel}
          <SortIndicator
            isSorted={isSorted}
            chromeClassName={chromeClassName}
          />
        </button>
      ) : (
        <div
          className={cn(
            "flex items-center",
            isCompact ? "h-7 px-1" : "h-8 min-w-0 flex-1 px-2",
          )}
        >
          {titleLabel}
        </div>
      )}
      {showColumnMenu ? (
        <ColumnHeaderMenu
          column={column}
          title={title}
          canSort={canSort}
          isSorted={isSorted}
          dateFilter={dateFilter}
          textFilter={textFilter}
          hasActiveFilter={hasActiveFilter}
          isCompact={isCompact}
          chromeClassName={chromeClassName}
          contentAlign="start"
          onHideColumn={onHideColumn}
        />
      ) : null}
    </div>
  );
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
  align = "start",
}: ColumnHeaderProps<TData, TValue>) {
  const { toggleColumnVisibility } = useColumnVisibility();
  const canSort = column.getCanSort();
  const hasActiveFilter =
    Boolean(dateFilter?.value.from || dateFilter?.value.to) ||
    Boolean(textFilter?.value.trim());
  const isCompact = density === "compact";
  const forceChromeVisible = Boolean(isSorted) || hasActiveFilter;
  const chromeClassName = getColumnHeaderChromeClassName(forceChromeVisible);
  const titleSwapClassName =
    getColumnHeaderTitleSwapClassName(forceChromeVisible);

  if (!visible) {
    return <span className="sr-only">{title}</span>;
  }

  const titleLabel = titleContent ?? (
    <span className="truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {title}
    </span>
  );

  if (!canSort && !dateFilter && !textFilter) {
    return (
      <div
        className={cn(
          "cursor-default",
          align === "center" && "flex w-full justify-center",
          className,
        )}
      >
        {titleLabel}
      </div>
    );
  }

  const onHideColumn = () => toggleColumnVisibility(column.id);
  const sharedProps = {
    column,
    title,
    titleLabel,
    className,
    canSort,
    isSorted,
    dateFilter,
    textFilter,
    hasActiveFilter,
    isCompact,
    chromeClassName,
    onHideColumn,
  };

  if (align === "center") {
    return (
      <CenterAlignedColumnHeader
        {...sharedProps}
        titleSwapClassName={titleSwapClassName}
      />
    );
  }

  return <StartAlignedColumnHeader {...sharedProps} />;
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
