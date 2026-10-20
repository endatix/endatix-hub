import { fitRowColumns } from "@/lib/endatix-api/reporting/submission-grid-row-columns";
import { z } from "zod";
import {
  completeMetadataOrder,
  isMetadataColumnKey,
  type SubmissionGridLayout,
} from "./submission-grid-view";

/** Column visibility and order the legacy grid kept in the browser. */
export type LegacyColumnView = {
  visibility?: Record<string, boolean>;
  order?: string[];
};

/** The legacy view in this grid's terms, shown as the unsaved view. */
export type MigratedColumnView = {
  /** Answer keys to show in order; `undefined` keeps the grid's default. */
  answerKeys?: string[];
  layout: SubmissionGridLayout;
};

export const legacyColumnVisibilityKey = (formId: string) =>
  `ehx_submissions_column_visibility_${formId}`;
export const legacyColumnOrderKey = (formId: string) =>
  `ehx_submissions_column_order_${formId}`;
/** Set once this grid has read the legacy keys; they are not read again. */
export const legacyViewMigratedKey = (formId: string) =>
  `ehx_submissions_view_migrated_${formId}`;

const LEGACY_DATA_PREFIX = "data_";
const LEGACY_SUBMITTER_PREFIX = "submitterProfile_";
const SUBMITTER_KEY_PREFIX = "submitter_";

const LegacyVisibilitySchema = z.object({
  columnVisibility: z.record(z.string(), z.boolean()),
});
const LegacyOrderSchema = z.object({ columnOrder: z.array(z.string()) });

/** `localStorage`, or `null` where the browser blocks it. */
export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * The legacy grid's column view for a form in this grid's keys, the first
 * time only; `null` after that, or when there is nothing to move.
 */
export function takeLegacyColumnView(
  formId: string,
  catalog: readonly { key: string }[],
  storage: Storage | null,
): MigratedColumnView | null {
  const legacy = storage && readLegacyColumnViewOnce(formId, storage);
  return legacy
    ? migrateLegacyColumnView(legacy, new Set(catalog.map((c) => c.key)))
    : null;
}

/**
 * Reads the legacy grid's column view for a form the first time only. The
 * legacy keys stay in place: the legacy grid still uses them. Storage that is
 * blocked or full reads as nothing.
 */
export function readLegacyColumnViewOnce(
  formId: string,
  storage: Storage,
): LegacyColumnView | null {
  try {
    return claimMigration(storage, formId)
      ? readLegacyKeys(storage, formId)
      : null;
  } catch {
    return null;
  }
}

function readLegacyKeys(
  storage: Storage,
  formId: string,
): LegacyColumnView | null {
  const visibility = readStored(
    storage,
    legacyColumnVisibilityKey(formId),
    LegacyVisibilitySchema,
  )?.columnVisibility;
  const order = readStored(
    storage,
    legacyColumnOrderKey(formId),
    LegacyOrderSchema,
  )?.columnOrder;
  return visibility || order ? { visibility, order } : null;
}

/** False when this grid already read the form's legacy view. */
function claimMigration(storage: Storage, formId: string): boolean {
  const marker = legacyViewMigratedKey(formId);
  if (storage.getItem(marker) !== null) {
    return false;
  }

  storage.setItem(marker, new Date().toISOString());
  return true;
}

function readStored<T>(
  storage: Storage,
  key: string,
  schema: z.ZodType<T>,
): T | undefined {
  const stored = storage.getItem(key);
  if (!stored) {
    return undefined;
  }

  const parsed = schema.safeParse(parseJson(stored));
  return parsed.success ? parsed.data : undefined;
}

/** A corrupt key reads as nothing without costing the other key. */
function parseJson(stored: string): unknown {
  try {
    return JSON.parse(stored);
  } catch {
    return undefined;
  }
}

/**
 * The legacy view in this grid's column keys. Legacy question columns were
 * hidden by default, so answers move over only when someone showed one;
 * otherwise this grid's default answer columns stay. `null` when nothing
 * differs from the defaults.
 */
export function migrateLegacyColumnView(
  legacy: LegacyColumnView,
  catalogKeys: ReadonlySet<string>,
): MigratedColumnView | null {
  const legacyIds = orderedLegacyIds(legacy);
  const visibility = legacy.visibility ?? {};
  const metadataIds = legacyIds.filter(isMetadataColumnKey);
  const layout: SubmissionGridLayout = {
    metadataOrder: completeMetadataOrder(metadataIds),
    hiddenMetadata: metadataIds.filter((id) => visibility[id] === false),
    widths: {},
  };
  const answerKeys = migratedAnswerKeys(legacyIds, visibility, catalogKeys);
  const changed =
    answerKeys !== undefined ||
    layout.hiddenMetadata.length > 0 ||
    layout.metadataOrder.join() !== completeMetadataOrder([]).join();
  return changed ? { answerKeys, layout } : null;
}

/** Saved order first; visibility-only ids after it. */
function orderedLegacyIds(legacy: LegacyColumnView): string[] {
  return [
    ...new Set([
      ...(legacy.order ?? []),
      ...Object.keys(legacy.visibility ?? {}),
    ]),
  ];
}

function migratedAnswerKeys(
  legacyIds: readonly string[],
  visibility: Readonly<Record<string, boolean>>,
  catalogKeys: ReadonlySet<string>,
): string[] | undefined {
  const shown = legacyIds.filter((id) => visibility[id] === true);
  if (!shown.some((id) => id.startsWith(LEGACY_DATA_PREFIX))) {
    return undefined;
  }

  const keys = fitRowColumns(
    shown
      .flatMap((id) => answerKeyOf(id) ?? [])
      .filter((key) => catalogKeys.has(key)),
  );
  return keys.length > 0 ? keys : undefined;
}

/** `data_q1` → `q1`, `submitterProfile_email` → `submitter_email`. */
function answerKeyOf(legacyId: string): string | undefined {
  if (legacyId.startsWith(LEGACY_DATA_PREFIX)) {
    return legacyId.slice(LEGACY_DATA_PREFIX.length);
  }

  return legacyId.startsWith(LEGACY_SUBMITTER_PREFIX)
    ? SUBMITTER_KEY_PREFIX + legacyId.slice(LEGACY_SUBMITTER_PREFIX.length)
    : undefined;
}
