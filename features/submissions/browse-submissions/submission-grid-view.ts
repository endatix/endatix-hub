import {
  SUBMISSION_VIEW_COLUMN_WIDTH_RANGE,
  type SubmissionViewColumnSetting,
  type SubmissionViewSettings,
} from "@/lib/endatix-api/reporting/submission-view-types";
import type {
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  answerColumnId,
  SUBMISSION_GRID_METADATA_COLUMN_IDS,
  type SubmissionGridMetadataColumnId,
} from "./submission-grid-columns";
import type {
  SubmissionGridRawSearchParams,
  SubmissionGridSort,
  SubmissionGridUrlState,
} from "./submission-grid-url";
import {
  SUBMISSION_GRID_PAGE_SIZE_OPTIONS,
  SUBMISSION_GRID_SORT_FIELDS,
  SUBMISSION_GRID_URL_KEYS as keys,
} from "./submission-grid-url.constants";

/** The view a form has before anyone saves one. */
export const DEFAULT_SUBMISSION_VIEW_SETTINGS: SubmissionViewSettings = {
  v: 1,
  columns: [],
};

/** The form's shared grid view; `revision` is `null` when it could not be read. */
export type SubmissionGridViewLoad = {
  revision: string | null;
  settings: SubmissionViewSettings;
};

/** What a view sets that the URL can override: answer columns, page size, sort. */
export type SubmissionGridViewDefaults = {
  /** Visible answer keys in order; `undefined` keeps the grid's default. */
  columns?: string[];
  pageSize?: number;
  sort?: SubmissionGridSort;
};

/**
 * What a view sets that only the browser holds: which metadata columns show,
 * their order, and column widths keyed by view key.
 */
export type SubmissionGridLayout = {
  metadataOrder: readonly SubmissionGridMetadataColumnId[];
  hiddenMetadata: readonly SubmissionGridMetadataColumnId[];
  widths: Readonly<Record<string, number>>;
};

/** The grid's current state that a save writes back as the view. */
export type SubmissionGridViewSnapshot = {
  answerKeys: readonly string[];
  pageSize: number;
  sort: SubmissionGridSort | undefined;
  layout: SubmissionGridLayout;
};

/** The parts of the TanStack table state a view decides. */
export type SubmissionGridTableLayout = {
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
};

const ACTIONS_COLUMN_ID = "actions";
const ANSWER_COLUMN_ID_PREFIX = answerColumnId("");
const METADATA_IDS: ReadonlySet<string> = new Set(
  SUBMISSION_GRID_METADATA_COLUMN_IDS,
);

export function isMetadataColumnKey(
  key: string,
): key is SubmissionGridMetadataColumnId {
  return METADATA_IDS.has(key);
}

/**
 * Settings as read, with malformed parts dropped: a view the Hub cannot read
 * shows as the default rather than breaking the grid.
 */
export function readViewSettings(value: unknown): SubmissionViewSettings {
  if (!isRecord(value)) {
    return DEFAULT_SUBMISSION_VIEW_SETTINGS;
  }

  const columns = Array.isArray(value.columns) ? value.columns : [];
  return {
    ...value,
    v: 1,
    columns: columns.filter(
      (column): column is SubmissionViewColumnSetting =>
        isRecord(column) && typeof column.key === "string",
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function viewDefaults(
  settings: SubmissionViewSettings,
): SubmissionGridViewDefaults {
  const answerKeys = settings.columns
    .filter((column) => column.visible !== false)
    .map((column) => column.key)
    .filter((key) => !isMetadataColumnKey(key));
  return {
    columns: answerKeys.length > 0 ? answerKeys : undefined,
    pageSize: offeredPageSize(settings.pageSize),
    sort: sortableSort(settings.sort),
  };
}

/**
 * The state the grid shows: what the URL says, and the view's columns, page
 * size and sort where the URL says nothing.
 */
/** `applyViewDefaults` with the defaults read from saved settings. */
export function withSavedView(
  state: SubmissionGridUrlState,
  raw: SubmissionGridRawSearchParams,
  settings: SubmissionViewSettings,
): SubmissionGridUrlState {
  return applyViewDefaults(state, raw, viewDefaults(settings));
}

export function applyViewDefaults(
  state: SubmissionGridUrlState,
  raw: SubmissionGridRawSearchParams,
  defaults: SubmissionGridViewDefaults,
): SubmissionGridUrlState {
  const urlHasPageSize = Boolean(raw[keys.pageSize]);
  return {
    ...state,
    pageSize: urlHasPageSize
      ? state.pageSize
      : (defaults.pageSize ?? state.pageSize),
    sort: state.sort ?? defaults.sort,
    columns: state.columns ?? defaults.columns,
  };
}

export function layoutFromSettings(
  settings: SubmissionViewSettings,
): SubmissionGridLayout {
  const metadata = settings.columns.filter((column) =>
    isMetadataColumnKey(column.key),
  );
  return {
    metadataOrder: completeMetadataOrder(metadata.map((column) => column.key)),
    hiddenMetadata: metadata
      .filter((column) => column.visible === false)
      .map((column) => column.key as SubmissionGridMetadataColumnId),
    widths: Object.fromEntries(
      settings.columns.flatMap((column) =>
        column.width === undefined ? [] : [[column.key, column.width]],
      ),
    ),
  };
}

/** Listed metadata ids first, the rest in the grid's own order. */
export function completeMetadataOrder(
  keys: readonly string[],
): SubmissionGridMetadataColumnId[] {
  const listed = [...new Set(keys)].filter(isMetadataColumnKey);
  const rest = SUBMISSION_GRID_METADATA_COLUMN_IDS.filter(
    (id) => !listed.includes(id),
  );
  return [...listed, ...rest];
}

/** Row actions stay first, metadata follows in view order, then answers. */
export function tableLayoutFromView(
  layout: SubmissionGridLayout,
): SubmissionGridTableLayout {
  return {
    columnOrder: [ACTIONS_COLUMN_ID, ...layout.metadataOrder],
    columnVisibility: Object.fromEntries(
      layout.hiddenMetadata.map((id) => [id, false]),
    ),
    columnSizing: Object.fromEntries(
      Object.entries(layout.widths).map(([key, width]) => [
        gridColumnIdOf(key),
        width,
      ]),
    ),
  };
}

/** Table column sizes back as view widths; row actions have none. */
export function widthsFromColumnSizing(
  sizing: ColumnSizingState,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(sizing).flatMap(([id, width]) => {
      const key = viewKeyOf(id);
      return key === undefined ? [] : [[key, clampWidth(width)]];
    }),
  );
}

/**
 * The view to save: metadata columns in order with their visibility, then
 * the visible answer columns. Unknown properties of the read view are kept.
 */
export function settingsFromGrid(
  base: SubmissionViewSettings,
  snapshot: SubmissionGridViewSnapshot,
): SubmissionViewSettings {
  const { sort } = snapshot;
  return {
    ...base,
    v: 1,
    columns: viewColumns(base.columns, snapshot),
    pageSize: snapshot.pageSize,
    sort: sort ? { key: sort.field, direction: sort.direction } : null,
  };
}

function viewColumns(
  readColumns: readonly SubmissionViewColumnSetting[],
  { layout, answerKeys }: SubmissionGridViewSnapshot,
): SubmissionViewColumnSetting[] {
  const previous = new Map(readColumns.map((column) => [column.key, column]));
  const column = (key: string, visible: boolean) =>
    withWidth({ ...previous.get(key), key, visible }, layout.widths[key]);
  return [
    ...layout.metadataOrder.map((key) =>
      column(key, !layout.hiddenMetadata.includes(key)),
    ),
    ...answerKeys.map((key) => column(key, true)),
  ];
}

function withWidth(
  column: SubmissionViewColumnSetting,
  width: number | undefined,
): SubmissionViewColumnSetting {
  const { width: _previous, ...rest } = column;
  return width === undefined ? rest : { ...rest, width: clampWidth(width) };
}

function clampWidth(width: number): number {
  const { min, max } = SUBMISSION_VIEW_COLUMN_WIDTH_RANGE;
  return Math.min(max, Math.max(min, Math.round(width)));
}

function gridColumnIdOf(key: string): string {
  return isMetadataColumnKey(key) ? key : answerColumnId(key);
}

function viewKeyOf(columnId: string): string | undefined {
  if (isMetadataColumnKey(columnId)) {
    return columnId;
  }

  return columnId.startsWith(ANSWER_COLUMN_ID_PREFIX)
    ? columnId.slice(ANSWER_COLUMN_ID_PREFIX.length)
    : undefined;
}

/** A saved size the footer does not offer is ignored. */
function offeredPageSize(pageSize: number | undefined): number | undefined {
  const offered: readonly number[] = SUBMISSION_GRID_PAGE_SIZE_OPTIONS;
  return pageSize !== undefined && offered.includes(pageSize)
    ? pageSize
    : undefined;
}

/** A saved sort on a column the API cannot sort by is ignored. */
function sortableSort(
  sort: SubmissionViewSettings["sort"],
): SubmissionGridSort | undefined {
  const sortable: readonly string[] = SUBMISSION_GRID_SORT_FIELDS;
  if (!sort || !sortable.includes(sort.key)) {
    return undefined;
  }

  return sort.direction === "asc" || sort.direction === "desc"
    ? {
        field: sort.key as SubmissionGridSort["field"],
        direction: sort.direction,
      }
    : undefined;
}
