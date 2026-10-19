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
import { useSearchKeyChanges } from "@/features/submissions/choose-filterable-questions/use-search-key-changes.hook";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
  type ColumnSearchAccess,
} from "../submission-grid-columns";
import {
  ColumnSearchAction,
  ColumnSearchMark,
  ColumnSearchSummary,
  type PickerSearch,
} from "./column-picker-search";
import { columnsUpdate } from "../submission-grid-url-updates";
import { useSubmissionGridUrl } from "./submission-grid-url-context";

/** Rows drawn at once; a 1,000-question form is narrowed by searching. */
export const COLUMN_PICKER_RENDER_LIMIT = 200;

type ColumnPickerProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  /** Marks filterable columns; editors also change which ones are. */
  columnSearch: ColumnSearchAccess;
  disabled: boolean;
};

/**
 * Picks the grid's answer columns: search by title or key, grouped by page
 * and panel. Changes stay a draft until Apply writes them to the URL.
 */
export function SubmissionGridColumnPicker(props: Readonly<ColumnPickerProps>) {
  const { open, setOpen, panel, apply, isPending } = useColumnPicker(props);
  const unavailable = props.disabled || props.catalog.length === 0 || isPending;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ColumnPickerTrigger disabled={unavailable} />
      <PopoverContent align="end" className="w-80 p-0">
        <ColumnPickerPanel {...panel} onApply={apply} />
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
 * Search key changes live here, outside the panel, so one that is running
 * finishes after the picker closes.
 */
function useColumnPicker({ formId, catalog, columnSearch }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const changes = useSearchKeyChanges(formId);
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
  const filterable = { access: columnSearch, changes };
  const panel = { catalog, visibleKeys, isDefault, filterable };
  return { open, setOpen, panel, apply, isPending };
}

type PanelProps = {
  catalog: readonly AnswerColumn[];
  visibleKeys: readonly string[];
  isDefault: boolean;
  filterable: PickerSearch;
  onApply: (keys: readonly string[]) => void;
};

/** Radix unmounts closed popover content, so each open starts a fresh draft. */
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
      <ColumnSearchSummary {...props.filterable} />
      <PickerFooter picker={picker} {...props} />
    </div>
  );
}

type ColumnPickerState = ReturnType<typeof useColumnPickerState>;
type ColumnDraft = ReturnType<typeof columnDraft>;

function useColumnPickerState({
  catalog,
  visibleKeys,
  filterable,
}: Readonly<PanelProps>) {
  const search = useColumnSearch(catalog);
  const draft = useColumnDraft(catalog, visibleKeys);
  const full = useMemo(
    () =>
      columnKeysOf(search.matches).some(
        (key) => !draft.visible.has(key) && !draft.fits(key),
      ),
    [search.matches, draft],
  );
  return { search, draft, full, filterable };
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

function useColumnDraft(
  catalog: readonly AnswerColumn[],
  visibleKeys: readonly string[],
) {
  const order = useMemo(() => columnOrder(catalog), [catalog]);
  const [keys, setKeys] = useState<readonly string[]>(visibleKeys);
  return useMemo(() => columnDraft(keys, setKeys, order), [keys, order]);
}

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
      <BulkActions matchingKeys={keys} picker={picker} />
    </div>
  );
}

type BulkActionsProps = {
  matchingKeys: readonly string[];
  picker: ColumnPickerState;
};

function BulkActions({ matchingKeys, picker }: Readonly<BulkActionsProps>) {
  const { search, draft } = picker;
  const canHide = matchingKeys.some((key) => draft.visible.has(key));
  const actions = [
    {
      label: "Show all",
      can: draft.adds(matchingKeys),
      run: () => draft.show(matchingKeys),
    },
    { label: "Hide all", can: canHide, run: () => draft.hide(matchingKeys) },
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
        <ColumnGroup key={item.group.id} item={item} picker={picker} />
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
  picker: ColumnPickerState;
};

function ColumnGroup({ item, picker }: Readonly<ColumnGroupProps>) {
  const { draft, filterable } = picker;
  return (
    <section className="pb-1">
      <GroupHeading group={item.group} draft={draft} />
      {item.columns.map((column) => (
        <ColumnOption key={column.key} {...{ column, draft, filterable }} />
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

type ColumnOptionProps = {
  column: AnswerColumn;
  draft: ColumnDraft;
  filterable: PickerSearch;
};

function ColumnOption({
  column,
  draft,
  filterable,
}: Readonly<ColumnOptionProps>) {
  return (
    <div className="flex items-center gap-1 pr-2 hover:bg-accent">
      <ColumnVisibility column={column} draft={draft} />
      <ColumnSearchMark column={column} />
      <ColumnSearchAction column={column} {...filterable} />
    </div>
  );
}

function ColumnVisibility({
  column,
  draft,
}: Readonly<{ column: AnswerColumn; draft: ColumnDraft }>) {
  const checked = draft.visible.has(column.key);
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-6 text-sm">
      <Checkbox
        checked={checked}
        disabled={!checked && !draft.fits(column.key)}
        onCheckedChange={() => draft.toggle(column.key)}
      />
      <ColumnOptionText column={column} />
    </label>
  );
}

function ColumnOptionText({ column }: Readonly<{ column: AnswerColumn }>) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate" title={column.title}>
        {column.title}
      </span>
      {column.title !== column.key && (
        <span
          className="truncate text-xs text-muted-foreground"
          title={column.key}
        >
          {column.key}
        </span>
      )}
    </span>
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
