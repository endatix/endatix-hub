import { fitRowColumns } from "@/lib/endatix-api/reporting/submission-grid-row-columns";
import {
  isSubmitterProfileColumn,
  type AnswerColumn,
} from "./submission-grid-columns";

export type ColumnPickerGroup = {
  id: string;
  /** Page title, or the page name when it has none; `null` outside a page. */
  pageLabel: string | null;
  panelLabel: string | null;
  columns: AnswerColumn[];
};

const SUBMITTER_GROUP: Omit<ColumnPickerGroup, "columns"> = {
  id: "submitter",
  pageLabel: "Submitter",
  panelLabel: null,
};

/**
 * Groups the catalog by page and panel. A page's loose questions and its
 * panels are separate groups; groups keep the order their first column has.
 */
export function groupColumnsByPlacement(
  catalog: readonly AnswerColumn[],
): ColumnPickerGroup[] {
  const groups = new Map<string, ColumnPickerGroup>();
  for (const column of catalog) {
    const group = describeGroup(column);
    const existing = groups.get(group.id);
    if (existing) {
      existing.columns.push(column);
    } else {
      groups.set(group.id, { ...group, columns: [column] });
    }
  }

  return [...groups.values()];
}

function describeGroup(
  column: AnswerColumn,
): Omit<ColumnPickerGroup, "columns"> {
  if (isSubmitterProfileColumn(column)) {
    return SUBMITTER_GROUP;
  }

  const { pageName, pageTitle, panelTitle } = column.placement;
  return {
    id: JSON.stringify([pageName, panelTitle]),
    pageLabel: pageTitle || pageName,
    panelLabel: panelTitle,
  };
}

/**
 * The groups with only the columns whose title or key contains `query`,
 * ignoring case. Empty groups are dropped; a blank query keeps everything.
 */
export function filterColumnGroups(
  groups: readonly ColumnPickerGroup[],
  query: string,
): ColumnPickerGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...groups];
  }

  return groups.flatMap((group) => {
    const columns = group.columns.filter((column) =>
      columnMatches(column, needle),
    );
    return columns.length > 0 ? [{ ...group, columns }] : [];
  });
}

function columnMatches(column: AnswerColumn, needle: string): boolean {
  return (
    column.title.toLowerCase().includes(needle) ||
    column.key.toLowerCase().includes(needle)
  );
}

/** "Page › Panel"; columns outside any page are "Other". */
export function groupLabel(group: ColumnPickerGroup): string {
  const parts = [group.pageLabel, group.panelLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" › ") : "Other";
}

export function countColumns(
  groups: readonly { columns: readonly unknown[] }[],
): number {
  return groups.reduce((total, group) => total + group.columns.length, 0);
}

/** A group as the picker draws it: bulk actions act on all of `group`. */
export type RenderedColumnGroup = {
  group: ColumnPickerGroup;
  columns: AnswerColumn[];
};

/**
 * The first `limit` columns of the groups, so a large form renders a bounded
 * list. Searching narrows the rest into view.
 */
export function limitRenderedColumns(
  groups: readonly ColumnPickerGroup[],
  limit: number,
): RenderedColumnGroup[] {
  const rendered: RenderedColumnGroup[] = [];
  let remaining = limit;
  for (const group of groups) {
    if (remaining <= 0) break;
    rendered.push({ group, columns: group.columns.slice(0, remaining) });
    remaining -= group.columns.length;
  }

  return rendered;
}

export function columnOrder(
  catalog: readonly AnswerColumn[],
): ReadonlyMap<string, number> {
  return new Map(catalog.map((column, index) => [column.key, index]));
}

/**
 * Shows `keys` at their place in the form, as many as fit the rows request
 * (key count and `columns=` length); earlier ones in the form first.
 * Visible keys stay, in their order.
 */
export function showColumns(
  visibleKeys: readonly string[],
  keys: readonly string[],
  order: ReadonlyMap<string, number>,
): string[] {
  const visible = new Set(visibleKeys);
  const added = [...new Set(keys)]
    .filter((key) => !visible.has(key))
    .sort((a, b) => position(order, a) - position(order, b));
  return mergeByOrder(visibleKeys, fitRowColumns(added, visibleKeys), order);
}

function mergeByOrder(
  visibleKeys: readonly string[],
  added: readonly string[],
  order: ReadonlyMap<string, number>,
): string[] {
  const merged: string[] = [];
  let next = 0;
  for (const key of visibleKeys) {
    while (
      next < added.length &&
      position(order, added[next]) < position(order, key)
    ) {
      merged.push(added[next++]);
    }
    merged.push(key);
  }
  return [...merged, ...added.slice(next)];
}

function position(order: ReadonlyMap<string, number>, key: string): number {
  return order.get(key) ?? Number.POSITIVE_INFINITY;
}

export function hideColumns(
  visibleKeys: readonly string[],
  keys: readonly string[],
): string[] {
  const hidden = new Set(keys);
  return visibleKeys.filter((key) => !hidden.has(key));
}

export function toggleColumn(
  visibleKeys: readonly string[],
  key: string,
  order: ReadonlyMap<string, number>,
): string[] {
  return visibleKeys.includes(key)
    ? hideColumns(visibleKeys, [key])
    : showColumns(visibleKeys, [key], order);
}

export type GroupSelection = "all" | "some" | "none";

export function groupSelection(
  group: ColumnPickerGroup,
  visible: ReadonlySet<string>,
): GroupSelection {
  const shown = group.columns.filter((column) => visible.has(column.key));
  if (shown.length === 0) return "none";
  return shown.length === group.columns.length ? "all" : "some";
}

export function columnKeysOf(groups: readonly ColumnPickerGroup[]): string[] {
  return groups.flatMap((group) => group.columns.map((column) => column.key));
}
