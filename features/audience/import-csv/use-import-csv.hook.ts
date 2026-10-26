"use client";

import { useRef, useState } from "react";
import {
  AudienceImportStatus,
  type AudienceIdentifierKind,
  type AudienceImportLimits,
  type AudienceImportView,
  type AudienceProperty,
  type StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import type { CsvRow } from "@/lib/utils/csv";
import { usePanelOpen } from "../use-panel-state.hook";
import { readCsvFile, type CsvPreview } from "./csv-preview";
import { isTerminal } from "./import-run";
import { sizeLabel } from "./import-labels";
import {
  useAudienceImport,
  type AudienceImportRun,
} from "./use-audience-import.hook";
import {
  propertyColumnMap,
  SKIP_COLUMN,
  suggestColumnChoices,
  type ColumnMap,
} from "./column-map";

/**
 * The wizard's steps; the outcome (`done`) is not a step of the track. Leaving the step before
 * Review starts the import, so a step added before Review keeps that order.
 */
export const IMPORT_STEPS = ["File", "Columns", "Review"] as const;

export type ImportStep = "file" | "columns" | "review" | "done";

const STEP_NUMBER: Record<ImportStep, number> = {
  file: 1,
  columns: 2,
  review: 3,
  done: 4,
};
const NEXT: Partial<Record<ImportStep, ImportStep>> = {
  file: "columns",
  columns: "review",
};
const PREVIOUS: Partial<Record<ImportStep, ImportStep>> = {
  columns: "file",
  review: "columns",
};

export type ImportCsvSetup = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  importLimits: AudienceImportLimits;
};

export type LoadedFile = { name: string; preview: CsvPreview; rows: CsvRow[] };

const NO_FILE: FileState = { file: null, problem: null };
const NO_CHOICES: ChoiceState = {
  identifierColumn: "",
  suggestedIdentifier: "",
  columns: {},
  asTest: false,
};
const UNREADABLE = "The file could not be read. Save it as CSV and try again.";

async function readFile(
  picked: File,
  limits: AudienceImportLimits,
): Promise<Result<LoadedFile>> {
  if (picked.size > limits.maxBytes) {
    return Result.validationError(
      `The file is ${sizeLabel(picked.size)}. Import files up to ${sizeLabel(limits.maxBytes)}.`,
    );
  }
  try {
    const read = readCsvFile(await picked.text(), limits.maxRows);
    if (Result.isError(read)) return read;
    const name = picked.name || "audience.csv";
    return Result.success({ name, ...read.value });
  } catch {
    return Result.validationError(UNREADABLE);
  }
}

type FileState = { file: LoadedFile | null; problem: string | null };

/** The chosen file and its preview, or why it cannot be imported; `onRead` gets the file. */
function useImportFile(
  limits: AudienceImportLimits,
  onRead: (file: LoadedFile) => void,
) {
  const [state, setState] = useState<FileState>(NO_FILE);
  const generation = useRef(0);
  const pick = async (picked: File) => {
    const current = ++generation.current;
    const read = await readFile(picked, limits);
    if (current !== generation.current) return;
    if (Result.isError(read))
      return setState({ file: null, problem: read.message });
    setState({ file: read.value, problem: null });
    onRead(read.value);
  };
  const reset = () => {
    generation.current += 1;
    setState(NO_FILE);
  };
  return { ...state, pick, reset };
}

type ChoiceState = {
  identifierColumn: string;
  /** The column the file's names suggested, so the field can say where its value came from. */
  suggestedIdentifier: string;
  columns: ColumnMap;
  /** Import as test participants: only those new to the form are added, as test participants. */
  asTest: boolean;
};

function withColumn(
  state: ChoiceState,
  column: string,
  variableName: string,
): ChoiceState {
  return { ...state, columns: { ...state.columns, [column]: variableName } };
}

/** The identifier column feeds no property: it is the participant, not one of their values. */
function withIdentifier(state: ChoiceState, column: string): ChoiceState {
  return {
    ...withColumn(state, column, SKIP_COLUMN),
    identifierColumn: column,
  };
}

function suggestedChoices(
  headers: string[],
  setup: ImportCsvSetup,
): ChoiceState {
  const { identifier, columns } = suggestColumnChoices(headers, setup);
  return {
    identifierColumn: identifier,
    suggestedIdentifier: identifier,
    columns,
    asTest: false,
  };
}

/** Which column identifies participants, which one was suggested, and what each other column feeds. */
function useColumnChoices(setup: ImportCsvSetup) {
  const [state, setState] = useState<ChoiceState>(NO_CHOICES);
  return {
    ...state,
    suggest: (headers: string[]) => setState(suggestedChoices(headers, setup)),
    setColumn: (column: string, variableName: string) =>
      setState((current) => withColumn(current, column, variableName)),
    chooseIdentifier: (column: string) =>
      setState((current) => withIdentifier(current, column)),
    setAsTest: (asTest: boolean) =>
      setState((current) => ({ ...current, asTest })),
  };
}

export type ImportChoices = ReturnType<typeof useColumnChoices>;

/** Where the wizard is before the import starts, and the steps either side of it. */
function useImportSteps() {
  const [step, setStep] = useState<ImportStep>("file");
  const previous = PREVIOUS[step];
  return {
    step,
    next: NEXT[step],
    setStep,
    back: previous ? () => setStep(previous) : undefined,
  };
}

function startRequest(
  file: LoadedFile,
  choices: ImportChoices,
): StartAudienceImportRequest {
  return {
    fileName: file.name,
    headers: file.preview.headers,
    rowCount: file.preview.rowCount,
    identifierColumn: choices.identifierColumn,
    propertyColumns: propertyColumnMap(choices.columns),
    isTest: choices.asTest,
  };
}

const uploadFile = (file: LoadedFile) => ({
  name: file.name,
  headers: file.preview.headers,
  rows: file.rows,
});

/** The import's view while one runs; `null` before it starts. */
export const runView = (run: AudienceImportRun): AudienceImportView | null =>
  run.state.kind === "idle" ? null : run.state.view;

/** A running import shows on Review; one that ended (and cannot resume) is the outcome. */
function runStep(run: AudienceImportRun): ImportStep | null {
  const view = runView(run);
  if (!view) return null;
  return isTerminal(view.status) && !view.canResume ? "done" : "review";
}

/** What the footer's main button does on Review and the outcome, or `null` while it waits. */
function runAction(run: AudienceImportRun, close: () => void) {
  const view = runView(run);
  if (!view || run.state.kind === "uploading") return null;
  if (view.status === AudienceImportStatus.Checked) return run.confirm;
  if (view.canResume) return run.resume;
  if (run.canSendAgain) return run.sendAgain;
  if (!isTerminal(view.status)) return null;
  return () => {
    run.dismiss();
    close();
  };
}

/** Whether the footer's main button may run: a file read, an identifier chosen, then the run's action. */
export function canContinue(wizard: ImportWizard): boolean {
  if (wizard.step === "file") return wizard.file !== null;
  if (wizard.step === "columns") return wizard.choices.identifierColumn !== "";
  return wizard.runAction !== null;
}

/**
 * The Import participants wizard: file → columns → review → outcome, in one panel. Leaving the
 * Columns step starts a staged import and uploads the file; nothing is written before Confirm.
 * A running import outlives the panel: closing it keeps the import, and the panel opens on it.
 */
export function useImportCsv(setup: ImportCsvSetup) {
  const choices = useColumnChoices(setup);
  const { reset: resetFile, ...source } = useImportFile(
    setup.importLimits,
    (file) => choices.suggest(file.preview.headers),
  );
  const steps = useImportSteps();
  const opener = useRef<() => void>(() => undefined);
  const run = useAudienceImport(setup.formId, {
    onFound: () => opener.current(),
  });
  const panel = usePanelOpen(() => {
    const view = runView(run);
    if (view && !isTerminal(view.status)) return;
    if (view && !view.canResume) run.dismiss();
    resetFile();
    steps.setStep("file");
  }, run.pending);
  opener.current = () => panel.openChange(true);
  const ran = runStep(run);
  const advance = async () => {
    if (ran) return runAction(run, panel.close)?.();
    if (steps.next !== "review") return steps.next && steps.setStep(steps.next);
    if (!source.file) return;
    const file = source.file;
    if (await run.start(startRequest(file, choices), uploadFile(file)))
      steps.setStep("review");
  };
  // A failed start's message belongs to the Columns step; going back to change a choice clears it.
  const back = steps.back && (() => (run.dismiss(), steps.back?.()));
  const continueWith = async (picked: File) => {
    const read = await readFile(picked, setup.importLimits);
    await run.continueWith(
      Result.isSuccess(read) ? Result.success(uploadFile(read.value)) : read,
    );
  };
  const step = ran ?? steps.step;
  return {
    ...source,
    ...panel,
    step,
    stepNumber: STEP_NUMBER[step],
    back: ran ? undefined : back,
    choices,
    run,
    runAction: runAction(run, panel.close),
    pending: run.pending,
    error: run.error,
    advance,
    continueWith,
  };
}

export type ImportWizard = ReturnType<typeof useImportCsv>;
