"use client";

import {
  describeUserSlots,
  searchKeyChangeFor,
} from "@/features/submissions/column-search";
import {
  AddSearchKeyButton,
  RefreshSearchKeysButton,
  RemoveSearchKeyButton,
} from "@/features/submissions/ui/search-key-buttons";
import type { SearchKeyChanges } from "@/features/submissions/ui/use-search-key-changes.hook";
import { Filter, Hourglass } from "lucide-react";
import type {
  AnswerColumn,
  ColumnSearchAccess,
} from "../submission-grid-columns";

/** The picker's filterable-column controls. */
export type PickerSearch = {
  access: ColumnSearchAccess;
  changes: SearchKeyChanges;
};

/** Says whether a column can be filtered; nothing when it cannot. */
export function ColumnSearchMark({
  column,
}: Readonly<{ column: AnswerColumn }>) {
  if (column.search.state === "ready") {
    return <MarkIcon label="Filterable" Icon={Filter} />;
  }
  if (column.search.state === "preparing") {
    return <MarkIcon label="Filter preparing" Icon={Hourglass} />;
  }
  return null;
}

function MarkIcon({
  label,
  Icon,
}: Readonly<{ label: string; Icon: typeof Filter }>) {
  return (
    <span title={label} className="shrink-0 text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Editors add an eligible column and remove the ones people chose. */
export function ColumnSearchAction({
  column,
  access,
  changes,
}: Readonly<PickerSearch & { column: AnswerColumn }>) {
  const change = searchKeyChangeFor(column.search, canChangeSearchKeys(access));
  const target = { key: column.key, title: column.title };
  if (change === "add") {
    return <AddSearchKeyButton target={target} changes={changes} />;
  }
  return change === "remove" ? (
    <RemoveSearchKeyButton target={target} changes={changes} />
  ) : null;
}

/** Editors see the slots people have used, and read the columns again. */
export function ColumnSearchSummary({
  access,
  changes,
}: Readonly<PickerSearch>) {
  if (!access.canEdit || !access.slots) return null;

  return (
    <div className="flex items-center gap-1 border-t px-2 py-1 text-xs">
      <span className="flex-1 text-muted-foreground">
        Filterable: {describeUserSlots(access.slots)}
      </span>
      <RefreshSearchKeysButton changes={changes} className="h-7 px-2 text-xs" />
    </div>
  );
}

/**
 * Editors change search keys only on an API that reports the form's slots;
 * an older API has no search-keys endpoints to call.
 */
function canChangeSearchKeys(access: ColumnSearchAccess): boolean {
  return access.canEdit && access.slots !== undefined;
}
