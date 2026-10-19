"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  fitsRowColumns,
  rowColumnsUsage,
} from "@/lib/endatix-api/reporting/submission-grid-row-columns";
import { Settings2 } from "lucide-react";
import {
  useDeferredValue,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  columnKeysOf,
  columnOrder,
  countColumns,
  filterColumnGroups,
  groupColumnsByPlacement,
  groupLabel,
  groupSelection,
  hideColumns,
  limitRenderedColumns,
  showColumns,
  toggleColumn,
  type ColumnPickerGroup,
  type GroupSelection,
  type RenderedColumnGroup,
} from "../submission-grid-column-picker";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
} from "../submission-grid-columns";
import { columnsUpdate } from "../submission-grid-url-updates";
import { useSubmissionGridUrl } from "./submission-grid-url-context";

/** Rows drawn at once; a 1,000-question form is narrowed by searching. */
export const COLUMN_PICKER_RENDER_LIMIT = 200;

type ColumnPickerProps = {
  catalog: readonly AnswerColumn[];
  disabled: boolean;
};

/**
 * Picks the grid's answer columns: search by title or key, grouped by page
 * and panel. Changes stay a draft until Apply writes them to the URL.
 */
export function SubmissionGridColumnPicker({
  catalog,
  disabled,
}: Readonly<ColumnPickerProps>) {
  const { open, setOpen, visibleKeys, apply, isDefault, isPending } =
    useColumnPicker(catalog);
  const unavailable = disabled || catalog.length === 0 || isPending;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={unavailable}>
          <Settings2 />
          <span className="sr-only sm:not-sr-only">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <ColumnPickerPanel
          {...{ catalog, visibleKeys, isDefault }}
          onApply={apply}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Apply writes the URL and closes; the rows reload with those columns. The
 * trigger waits for that load, so a reopened draft starts from them.
 */
function useColumnPicker(catalog: readonly AnswerColumn[]) {
  const [open, setOpen] = useState(false);
  const { urlState, updateUrl, isPending } = useSubmissionGridUrl();
  const visibleKeys = useMemo(
    () =>
      resolveVisibleAnswerColumns(catalog, urlState.columns).map(
        (column) => column.key,
      ),
    [catalog, urlState.columns],
  );
  const apply = (keys: readonly string[]) => {
    updateUrl(columnsUpdate(keys));
    setOpen(false);
  };
  const isDefault = urlState.columns === undefined;
  return { open, setOpen, visibleKeys, apply, isDefault, isPending };
}

type PanelProps = {
  catalog: readonly AnswerColumn[];
  visibleKeys: readonly string[];
  isDefault: boolean;
  /** No keys: back to the default view. */
  onApply: (keys: readonly string[]) => void;
};

/** Mounts on each open, so the draft starts from the grid's columns. */
function ColumnPickerPanel(props: Readonly<PanelProps>) {
  const picker = useColumnPickerDraft(props);
  return (
    <div className="flex flex-col">
      <div className="border-b p-2">
        <Input
          aria-label="Search columns"
          placeholder="Search columns"
          value={picker.query}
          onChange={(event) => picker.setQuery(event.target.value)}
          className="h-8"
        />
      </div>
      <MatchActions picker={picker} />
      <ColumnGroupList picker={picker} />
      <PickerFooter picker={picker} {...props} />
    </div>
  );
}

type ColumnPickerDraft = ReturnType<typeof useColumnPickerDraft>;

function useColumnPickerDraft({ catalog, visibleKeys }: Readonly<PanelProps>) {
  const groups = useMemo(() => groupColumnsByPlacement(catalog), [catalog]);
  const order = useMemo(() => columnOrder(catalog), [catalog]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(
    () => filterColumnGroups(groups, deferredQuery),
    [groups, deferredQuery],
  );
  const [draft, setDraft] = useState<readonly string[]>(visibleKeys);
  const visible = useMemo(() => new Set(draft), [draft]);
  const usage = useMemo(() => rowColumnsUsage(draft), [draft]);
  const full = useMemo(
    () => isFullFor(matches, visible, (key) => fitsRowColumns(usage, key)),
    [matches, visible, usage],
  );
  // Bulk actions wait for the matches to catch up with what was typed.
  const settled = query === deferredQuery;
  return {
    query,
    deferredQuery,
    settled,
    setQuery,
    matches,
    draft,
    setDraft,
    visible,
    usage,
    full,
    order,
  };
}

/** Some hidden match no longer fits the rows request. */
function isFullFor(
  matches: readonly ColumnPickerGroup[],
  visible: ReadonlySet<string>,
  fits: (key: string) => boolean,
): boolean {
  return columnKeysOf(matches).some((key) => !visible.has(key) && !fits(key));
}

/** Show all and Hide all act on every matching column, drawn or not. */
function MatchActions({ picker }: Readonly<{ picker: ColumnPickerDraft }>) {
  const { draft, visible, settled } = picker;
  const keys = columnKeysOf(picker.matches);
  const show = (current: readonly string[]) =>
    showColumns(current, keys, picker.order);
  const update = (change: (current: readonly string[]) => string[]) => () =>
    picker.setDraft((current) => change(current));
  const canHide = keys.some((key) => visible.has(key));
  return (
    <div className="flex items-center gap-1 border-b px-2 py-1 text-xs">
      <PickerCount>
        {matchSummary(keys.length, picker.deferredQuery)}
      </PickerCount>
      <BulkButton
        disabled={!settled || show(draft).length === draft.length}
        onClick={update(show)}
      >
        Show all
      </BulkButton>
      <BulkButton
        disabled={!settled || !canHide}
        onClick={update((current) => hideColumns(current, keys))}
      >
        Hide all
      </BulkButton>
    </div>
  );
}

function PickerCount({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="flex-1 text-muted-foreground">{children}</span>;
}

function BulkButton(props: Readonly<ComponentProps<typeof Button>>) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" {...props} />
  );
}

function matchSummary(count: number, query: string): string {
  const noun = count === 1 ? "column" : "columns";
  return query.trim() ? `${count} matching ${noun}` : `${count} ${noun}`;
}

function ColumnGroupList({ picker }: Readonly<{ picker: ColumnPickerDraft }>) {
  const rendered = limitRenderedColumns(
    picker.matches,
    COLUMN_PICKER_RENDER_LIMIT,
  );
  const hiddenCount = countColumns(picker.matches) - countRendered(rendered);
  return (
    <div className="max-h-80 overflow-y-auto py-1">
      {rendered.map((item) => (
        <ColumnGroup key={item.group.id} item={item} picker={picker} />
      ))}
      {rendered.length === 0 && <PickerNote>No columns match.</PickerNote>}
      {hiddenCount > 0 && (
        <PickerNote>
          {hiddenCount} more columns. Search to find them.
        </PickerNote>
      )}
    </div>
  );
}

function countRendered(rendered: readonly RenderedColumnGroup[]): number {
  return rendered.reduce((total, item) => total + item.columns.length, 0);
}

function PickerNote({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

type ColumnGroupProps = {
  item: RenderedColumnGroup;
  picker: ColumnPickerDraft;
};

function ColumnGroup({ item, picker }: Readonly<ColumnGroupProps>) {
  return (
    <section className="pb-1">
      <GroupHeading group={item.group} picker={picker} />
      {item.columns.map((column) => (
        <ColumnOption key={column.key} column={column} picker={picker} />
      ))}
    </section>
  );
}

function GroupHeading({
  group,
  picker,
}: Readonly<{ group: ColumnPickerGroup; picker: ColumnPickerDraft }>) {
  const selection = groupSelection(group, picker.visible);
  const label = groupLabel(group);
  const change = toggleGroup(group, selection, picker.order);
  const inert = change(picker.draft).length === picker.draft.length;
  const toggle = () => picker.setDraft(change);
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Checkbox
        aria-label={`Show all columns in ${label}`}
        checked={selection === "some" ? "indeterminate" : selection === "all"}
        onCheckedChange={toggle}
        disabled={selection !== "all" && inert}
      />
      <span className="truncate" title={label}>
        {label}
      </span>
    </label>
  );
}

function toggleGroup(
  group: ColumnPickerGroup,
  selection: GroupSelection,
  order: ReadonlyMap<string, number>,
) {
  const keys = columnKeysOf([group]);
  return (draft: readonly string[]) =>
    selection === "all"
      ? hideColumns(draft, keys)
      : showColumns(draft, keys, order);
}

function ColumnOption({
  column,
  picker,
}: Readonly<{ column: AnswerColumn; picker: ColumnPickerDraft }>) {
  const checked = picker.visible.has(column.key);
  return (
    <label className="flex items-center gap-2 py-1 pr-3 pl-6 text-sm hover:bg-accent">
      <Checkbox
        checked={checked}
        disabled={!checked && !fitsRowColumns(picker.usage, column.key)}
        onCheckedChange={() =>
          picker.setDraft((draft) =>
            toggleColumn(draft, column.key, picker.order),
          )
        }
      />
      <ColumnOptionText column={column} />
    </label>
  );
}

/** The title, and the key when it differs, since search matches both. */
function ColumnOptionText({ column }: Readonly<{ column: AnswerColumn }>) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate" title={column.title}>
        {column.title}
      </span>
      {column.title !== column.key && (
        <span className="max-w-24 truncate text-xs text-muted-foreground">
          {column.key}
        </span>
      )}
    </>
  );
}

type FooterProps = PanelProps & { picker: ColumnPickerDraft };

function PickerFooter(props: FooterProps) {
  const { picker, catalog, visibleKeys, isDefault, onApply } = props;
  const { draft } = picker;
  return (
    <div className="flex items-center gap-2 border-t p-2 text-xs">
      <PickerCount>{footerSummary(picker, catalog.length)}</PickerCount>
      <Button
        variant="ghost"
        size="sm"
        disabled={isDefault}
        onClick={() => onApply([])}
      >
        Default
      </Button>
      <Button
        size="sm"
        disabled={draft.length === 0 || sameKeys(draft, visibleKeys)}
        onClick={() => onApply(draft)}
      >
        Apply
      </Button>
    </div>
  );
}

function footerSummary(
  { draft, full }: ColumnPickerDraft,
  total: number,
): string {
  if (draft.length === 0) return "Choose at least one column";
  const shown = `${draft.length} of ${total} shown`;
  return full
    ? `${shown}. The view is full: hide a column to show another.`
    : shown;
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
