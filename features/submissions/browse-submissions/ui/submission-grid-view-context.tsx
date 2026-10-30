"use client";

import { toast } from "@/components/ui/toast";
import { UNSAVED_SUBMISSION_VIEW_VERSION } from "@/lib/endatix-api/reporting/submission-view-types";
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

export type SubmissionGridView = {
  tableLayout: SubmissionGridTableLayout;
  onColumnSizingChange: (updater: Updater<ColumnSizingState>) => void;
  hiddenMetadata: readonly SubmissionGridMetadataColumnId[];
  setMetadataVisible: (
    id: SubmissionGridMetadataColumnId,
    visible: boolean,
  ) => void;
  canSave: boolean;
  isSaving: boolean;
  save: () => void;
  saveError: string | null;
};

const VIEW_SAVED_MESSAGE = "View saved for everyone on this form.";

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
    canSave: canSaveView && view.version !== null,
    ...saving,
  };
}

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

function useViewLayout(view: SubmissionGridViewLoad) {
  const [state, setState] = useState(() => ({
    version: view.version,
    layout: layoutFromSettings(view.settings),
  }));
  if (state.version !== view.version) {
    setState({
      version: view.version,
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

function useLegacyViewMigration(input: MigrationInput) {
  const { formId, catalog, view, setLayout, updateUrl } = input;
  const urlHasColumns = useSearchParams().has(keys.columns);
  useEffect(() => {
    if (view.version !== UNSAVED_SUBMISSION_VIEW_VERSION) return;
    const migrated = takeLegacyColumnView(formId, catalog, browserStorage());
    if (!migrated) return;
    setLayout(() => migrated.layout);
    if (migrated.answerKeys && !urlHasColumns) {
      updateUrl(columnsUpdate(migrated.answerKeys));
    }
  }, [formId, catalog, view.version, setLayout, updateUrl, urlHasColumns]);
}

type SaveInput = {
  formId: string;
  catalog: readonly AnswerColumn[];
  view: SubmissionGridViewLoad;
  layout: SubmissionGridLayout;
  grid: SubmissionGridUrl;
};

function useSaveView({ formId, catalog, view, layout, grid }: SaveInput) {
  const reloadView = useReloadView(grid.updateUrl);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = () => {
    const { version } = view;
    if (version === null) return;
    const settings = settingsToSave({ view, layout, grid, catalog });
    startSaving(async () => {
      const outcome = saveViewOutcome(
        await saveSubmissionGridViewAction(formId, { version, settings }),
      );
      setSaveError(outcome.kind === "saved" ? null : outcome.message);
      if (outcome.kind === "saved") toast.success(VIEW_SAVED_MESSAGE);
      if (outcome.kind !== "error") reloadView();
    });
  };
  return { isSaving, save, saveError };
}

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
