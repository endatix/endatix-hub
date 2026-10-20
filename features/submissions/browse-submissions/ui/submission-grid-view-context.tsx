"use client";

import { toast } from "@/components/ui/toast";
import { UNSAVED_SUBMISSION_VIEW_REVISION } from "@/lib/endatix-api/reporting/submission-view-types";
import {
  functionalUpdate,
  type ColumnSizingState,
  type Updater,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { saveSubmissionGridViewAction } from "../save-submission-grid-view.action";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
  type SubmissionGridMetadataColumnId,
} from "../submission-grid-columns";
import type { SubmissionGridUrlState } from "../submission-grid-url";
import { SUBMISSION_GRID_URL_KEYS as keys } from "../submission-grid-url.constants";
import { columnsUpdate } from "../submission-grid-url-updates";
import {
  layoutFromSettings,
  settingsFromGrid,
  tableLayoutFromView,
  widthsFromColumnSizing,
  type SubmissionGridLayout,
  type SubmissionGridTableLayout,
  type SubmissionGridViewLoad,
} from "../submission-grid-view";
import {
  browserStorage,
  takeLegacyColumnView,
} from "../submission-grid-view-migration";
import { saveViewOutcome } from "../submission-grid-view-save-outcome";
import {
  useSubmissionGridUrl,
  type SubmissionGridUrl,
} from "./submission-grid-url-context";

/** The view the grid shows, with the changes not saved yet. */
export type SubmissionGridView = {
  tableLayout: SubmissionGridTableLayout;
  onColumnSizingChange: (updater: Updater<ColumnSizingState>) => void;
  hiddenMetadata: readonly SubmissionGridMetadataColumnId[];
  setMetadataVisible: (
    id: SubmissionGridMetadataColumnId,
    visible: boolean,
  ) => void;
  /** Form editors save; a view that could not be read cannot be saved over. */
  canSave: boolean;
  isSaving: boolean;
  save: () => void;
  /** Why the last save did not go through; shown inline above the rows. */
  saveError: string | null;
};

const VIEW_SAVED_MESSAGE = "View saved for everyone on this form.";

/** URL params the saved view fills in; a save or reload clears them. */
const VIEW_OVERRIDE_UPDATE = {
  [keys.columns]: null,
  [keys.pageSize]: null,
  [keys.sort]: null,
  [keys.page]: null,
};

const SubmissionGridViewContext = createContext<SubmissionGridView | null>(
  null,
);

type SubmissionGridViewProviderProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  view: SubmissionGridViewLoad;
  canSaveView: boolean;
  children: ReactNode;
};

/** Holds the unsaved view between row reloads. Needs the grid's URL context. */
export function SubmissionGridViewProvider({
  children,
  ...props
}: Readonly<SubmissionGridViewProviderProps>) {
  const value = useSubmissionGridViewState(props);
  return (
    <SubmissionGridViewContext value={value}>
      {children}
    </SubmissionGridViewContext>
  );
}

export function useSubmissionGridView(): SubmissionGridView {
  const value = use(SubmissionGridViewContext);
  if (!value) {
    throw new Error(
      "useSubmissionGridView must be used inside SubmissionGridViewProvider",
    );
  }
  return value;
}

function useSubmissionGridViewState({
  formId,
  catalog,
  view,
  canSaveView,
}: Omit<SubmissionGridViewProviderProps, "children">): SubmissionGridView {
  const [layout, setLayout] = useViewLayout(view);
  const grid = useSubmissionGridUrl();
  const { updateUrl } = grid;
  useLegacyViewMigration({ formId, catalog, view, setLayout, updateUrl });
  const saving = useSaveView({ formId, catalog, view, layout, grid });
  return {
    ...layoutControls(layout, setLayout),
    canSave: canSaveView && view.revision !== null,
    ...saving,
  };
}

/** The unsaved layout as table state, and the setters that change it. */
function layoutControls(layout: SubmissionGridLayout, setLayout: LayoutSetter) {
  return {
    tableLayout: tableLayoutFromView(layout),
    onColumnSizingChange: (updater: Updater<ColumnSizingState>) =>
      setLayout((current) => withSizing(current, updater)),
    hiddenMetadata: layout.hiddenMetadata,
    setMetadataVisible: (
      id: SubmissionGridMetadataColumnId,
      visible: boolean,
    ) => setLayout((current) => withMetadataVisible(current, id, visible)),
  };
}

/** The read view's layout; a new revision (a save, a reload) starts over. */
function useViewLayout(view: SubmissionGridViewLoad) {
  const [state, setState] = useState(() => ({
    revision: view.revision,
    layout: layoutFromSettings(view.settings),
  }));
  if (state.revision !== view.revision) {
    setState({
      revision: view.revision,
      layout: layoutFromSettings(view.settings),
    });
  }

  const setLayout = useMemo(
    () => (update: (current: SubmissionGridLayout) => SubmissionGridLayout) =>
      setState((current) => ({ ...current, layout: update(current.layout) })),
    [],
  );
  return [state.layout, setLayout] as const;
}

type LayoutSetter = ReturnType<typeof useViewLayout>[1];

function withSizing(
  layout: SubmissionGridLayout,
  updater: Updater<ColumnSizingState>,
): SubmissionGridLayout {
  const sizing = tableLayoutFromView(layout).columnSizing;
  const next = functionalUpdate(updater, sizing);
  return { ...layout, widths: widthsFromColumnSizing(next) };
}

function withMetadataVisible(
  layout: SubmissionGridLayout,
  id: SubmissionGridMetadataColumnId,
  visible: boolean,
): SubmissionGridLayout {
  const others = layout.hiddenMetadata.filter((hidden) => hidden !== id);
  return { ...layout, hiddenMetadata: visible ? others : [...others, id] };
}

type MigrationInput = {
  formId: string;
  catalog: readonly AnswerColumn[];
  view: SubmissionGridViewLoad;
  setLayout: LayoutSetter;
  updateUrl: SubmissionGridUrl["updateUrl"];
};

/**
 * Once per form and browser, while nobody has saved a view: the legacy grid's
 * column choice becomes the unsaved view. Answer columns go to the URL, so
 * the rows load them, unless the URL already picks columns.
 */
function useLegacyViewMigration(input: MigrationInput) {
  const { formId, catalog, view, setLayout, updateUrl } = input;
  const urlHasColumns = useSearchParams().has(keys.columns);
  useEffect(() => {
    if (view.revision !== UNSAVED_SUBMISSION_VIEW_REVISION) return;
    const migrated = takeLegacyColumnView(formId, catalog, browserStorage());
    if (!migrated) return;
    setLayout(() => migrated.layout);
    if (migrated.answerKeys && !urlHasColumns) {
      updateUrl(columnsUpdate(migrated.answerKeys));
    }
  }, [formId, catalog, view.revision, setLayout, updateUrl, urlHasColumns]);
}

type SaveInput = {
  formId: string;
  catalog: readonly AnswerColumn[];
  view: SubmissionGridViewLoad;
  layout: SubmissionGridLayout;
  grid: SubmissionGridUrl;
};

/**
 * Saves what the grid shows. Saved or refused as stale, the grid then reads
 * the view again (see `useReloadView`).
 */
function useSaveView({ formId, catalog, view, layout, grid }: SaveInput) {
  const reloadView = useReloadView(grid.updateUrl);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = () => {
    const { revision } = view;
    if (revision === null) return;
    const settings = settingsToSave({ view, layout, grid, catalog });
    startSaving(async () => {
      const outcome = saveViewOutcome(
        await saveSubmissionGridViewAction(formId, { revision, settings }),
      );
      setSaveError(outcome.kind === "saved" ? null : outcome.message);
      if (outcome.kind === "saved") toast.success(VIEW_SAVED_MESSAGE);
      if (outcome.kind !== "error") reloadView();
    });
  };
  return { isSaving, save, saveError };
}

/** What the grid shows now, as view settings over the ones read. */
function settingsToSave({
  view,
  layout,
  grid,
  catalog,
}: Omit<SaveInput, "formId">) {
  return settingsFromGrid(view.settings, {
    ...gridSnapshot(grid.urlState, catalog),
    layout,
  });
}

function gridSnapshot(
  state: SubmissionGridUrlState,
  catalog: readonly AnswerColumn[],
) {
  const answers = resolveVisibleAnswerColumns(catalog, state.columns);
  return {
    answerKeys: answers.map((column) => column.key),
    pageSize: state.pageSize,
    sort: state.sort,
  };
}

/**
 * Reads the saved view again with the URL's own column, page size and sort
 * choices cleared, so the grid shows exactly what is saved.
 */
function useReloadView(updateUrl: SubmissionGridUrl["updateUrl"]) {
  const router = useRouter();
  return () => {
    // Read after the save's await: the user may have changed the URL since.
    const current = new URLSearchParams(globalThis.location.search);
    const overrides = Object.keys(VIEW_OVERRIDE_UPDATE);
    if (overrides.some((key) => current.has(key))) {
      updateUrl(VIEW_OVERRIDE_UPDATE);
    } else {
      router.refresh();
    }
  };
}
