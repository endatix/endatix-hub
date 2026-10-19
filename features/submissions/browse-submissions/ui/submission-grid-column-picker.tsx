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
  type Dispatch,
  type ReactNode,
  type SetStateAction,
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
      <ColumnPickerTrigger disabled={unavailable} />
      <PopoverContent align="end" className="w-80 p-0">
        <ColumnPickerPanel
          {...{ catalog, visibleKeys, isDefault }}
          onApply={apply}
        />
      </PopoverContent>
    </Popover>
  );
}

function ColumnPickerTrigger({ disabled }: Readonly<{ disabled: boolean }>) {
  return (
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" disabled={disabled}>
        <Settings2 />
        <span className="sr-only sm:not-sr-only">Columns</span>
      </Button>
    </PopoverTrigger>
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
  const picker = useColumnPickerState(props);
  return (
    <div className="flex flex-col">
      <div className="border-b p-2">
        <Input
          aria-label="Search columns"
          placeholder="Search columns"
          value={picker.search.query}
          onChange={(event) => picker.search.setQuery(event.target.value)}
          className="h-8"
        />
      </div>
      <MatchActions picker={picker} />
      <ColumnGroupList picker={picker} />
      <PickerFooter picker={picker} {...props} />
    </div>
  );
}

type ColumnPickerState = ReturnType<typeof useColumnPickerState>;
type ColumnDraft = ReturnType<typeof columnDraft>;

function useColumnPickerState({ catalog, visibleKeys }: Readonly<PanelProps>) {
  const search = useColumnSearch(catalog);
  const draft = useColumnDraft(catalog, visibleKeys);
  const full = useMemo(
    () =>
      columnKeysOf(search.matches).some(
        (key) => !draft.visible.has(key) && !draft.fits(key),
      ),
    [search.matches, draft],
  );
  return { search, draft, full };
}

function useColumnSearch(catalog: readonly AnswerColumn[]) {
  const groups = useMemo(() => groupColumnsByPlacement(catalog), [catalog]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(
    () => filterColumnGroups(groups, deferredQuery),
    [groups, deferredQuery],
  );
  // Bulk actions wait for the matches to catch up with what was typed.
  const settled = query === deferredQuery;
  return { query, setQuery, deferredQuery, matches, settled };
}

/** The draft's keys and what the controls may do to them. */
function useColumnDraft(
  catalog: readonly AnswerColumn[],
  visibleKeys: readonly string[],
) {
  const order = useMemo(() => columnOrder(catalog), [catalog]);
  const [keys, setKeys] = useState<readonly string[]>(visibleKeys);
  return useMemo(() => columnDraft(keys, setKeys, order), [keys, order]);
}

/** `adds(keys)`: whether showing `keys` would add any of them. */
function columnDraft(
  keys: readonly string[],
  setKeys: Dispatch<SetStateAction<readonly string[]>>,
  order: ReadonlyMap<string, number>,
) {
  const usage = rowColumnsUsage(keys);
  return {
    keys,
    visible: new Set(keys),
    show: (add: readonly string[]) =>
      setKeys((current) => showColumns(current, add, order)),
    hide: (remove: readonly string[]) =>
      setKeys((current) => hideColumns(current, remove)),
    toggle: (key: string) =>
      setKeys((current) => toggleColumn(current, key, order)),
    adds: (add: readonly string[]) =>
      showColumns(keys, add, order).length > keys.length,
    fits: (key: string) => fitsRowColumns(usage, key),
  };
}

function MatchActions({ picker }: Readonly<{ picker: ColumnPickerState }>) {
  const { search } = picker;
  const keys = columnKeysOf(search.matches);
  return (
    <div className="flex items-center gap-1 border-b px-2 py-1 text-xs">
      <PickerCount>
        {matchSummary(keys.length, search.deferredQuery)}
      </PickerCount>
      <BulkActions keys={keys} picker={picker} />
    </div>
  );
}

/** Show all and Hide all act on every matching column, drawn or not. */
function BulkActions({
  keys,
  picker: { search, draft },
}: Readonly<{ keys: readonly string[]; picker: ColumnPickerState }>) {
  const canHide = keys.some((key) => draft.visible.has(key));
  const actions = [
    { label: "Show all", can: draft.adds(keys), run: () => draft.show(keys) },
    { label: "Hide all", can: canHide, run: () => draft.hide(keys) },
  ];
  return actions.map(({ label, can, run }) => (
    <BulkButton key={label} disabled={!search.settled || !can} onClick={run}>
      {label}
    </BulkButton>
  ));
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
  const noun = columnNoun(count);
  return query.trim() ? `${count} matching ${noun}` : `${count} ${noun}`;
}

function columnNoun(count: number): string {
  return count === 1 ? "column" : "columns";
}

function ColumnGroupList({ picker }: Readonly<{ picker: ColumnPickerState }>) {
  const { matches } = picker.search;
  const rendered = limitRenderedColumns(matches, COLUMN_PICKER_RENDER_LIMIT);
  const hiddenCount = countColumns(matches) - countColumns(rendered);
  return (
    <div className="max-h-80 overflow-y-auto py-1">
      {rendered.map((item) => (
        <ColumnGroup key={item.group.id} item={item} draft={picker.draft} />
      ))}
      {rendered.length === 0 && <PickerNote>No columns match.</PickerNote>}
      {hiddenCount > 0 && (
        <PickerNote>
          {hiddenCount} more {columnNoun(hiddenCount)}. Search to find them.
        </PickerNote>
      )}
    </div>
  );
}

function PickerNote({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

type ColumnGroupProps = {
  item: RenderedColumnGroup;
  draft: ColumnDraft;
};

function ColumnGroup({ item, draft }: Readonly<ColumnGroupProps>) {
  return (
    <section className="pb-1">
      <GroupHeading group={item.group} draft={draft} />
      {item.columns.map((column) => (
        <ColumnOption key={column.key} column={column} draft={draft} />
      ))}
    </section>
  );
}

function GroupHeading({
  group,
  draft,
}: Readonly<{ group: ColumnPickerGroup; draft: ColumnDraft }>) {
  const label = groupLabel(group);
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Checkbox
        aria-label={`Columns in ${label}`}
        {...groupCheckbox(group, draft)}
      />
      <span className="truncate" title={label}>
        {label}
      </span>
    </label>
  );
}

/** Ticks a whole group; a fully shown group hides instead. */
function groupCheckbox(group: ColumnPickerGroup, draft: ColumnDraft) {
  const keys = columnKeysOf([group]);
  const selection = groupSelection(group, draft.visible);
  const all = selection === "all";
  return {
    checked: selection === "some" ? ("indeterminate" as const) : all,
    onCheckedChange: () => (all ? draft.hide(keys) : draft.show(keys)),
    disabled: !all && !draft.adds(keys),
  };
}

function ColumnOption({
  column,
  draft,
}: Readonly<{ column: AnswerColumn; draft: ColumnDraft }>) {
  const checked = draft.visible.has(column.key);
  return (
    <label className="flex items-center gap-2 py-1 pr-3 pl-6 text-sm hover:bg-accent">
      <Checkbox
        checked={checked}
        disabled={!checked && !draft.fits(column.key)}
        onCheckedChange={() => draft.toggle(column.key)}
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
        <span
          className="max-w-24 truncate text-xs text-muted-foreground"
          title={column.key}
        >
          {column.key}
        </span>
      )}
    </>
  );
}

type FooterProps = PanelProps & { picker: ColumnPickerState };

function PickerFooter(props: Readonly<FooterProps>) {
  const { picker, catalog } = props;
  return (
    <div className="flex items-center gap-2 border-t p-2 text-xs">
      <PickerCount>{footerSummary(picker, catalog.length)}</PickerCount>
      <FooterButtons {...props} />
    </div>
  );
}

function FooterButtons(props: Readonly<FooterProps>) {
  const { isDefault, onApply } = props;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={isDefault}
        onClick={() => onApply([])}
      >
        Default
      </Button>
      <ApplyButton {...props} />
    </>
  );
}

function ApplyButton({ picker, visibleKeys, onApply }: Readonly<FooterProps>) {
  const { keys } = picker.draft;
  return (
    <Button
      size="sm"
      disabled={keys.length === 0 || sameKeys(keys, visibleKeys)}
      onClick={() => onApply(keys)}
    >
      Apply
    </Button>
  );
}

function footerSummary(
  { draft, full }: ColumnPickerState,
  total: number,
): string {
  if (draft.keys.length === 0) return "Choose at least one column";
  const shown = `${draft.keys.length} of ${total} shown`;
  return full
    ? `${shown}. The view is full: hide a column to show another.`
    : shown;
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}
