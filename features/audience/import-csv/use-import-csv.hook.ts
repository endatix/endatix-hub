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
import { readCsvFile, type CsvFile, type CsvPreview } from "./csv-preview";
import {
  firstOversizedChunk,
  IMPORT_CHUNK_BODY_BYTES,
  IMPORT_CHUNK_ROWS,
} from "./import-chunk-payload";
import { confirmCount, isTerminal } from "./import-run";
import { sizeLabel } from "./import-labels";
import {
  useAudienceImport,
  type AudienceImportRun,
} from "./use-audience-import.hook";
import {
  propertyColumnMap,
  queuedColumns,
  SKIP_COLUMN,
  suggestColumnChoices,
  type ColumnMap,
} from "./column-map";
import {
  useNewProperties,
  type NewProperties,
} from "./use-new-properties.hook";

/**
 * The wizard's steps in order, with the label its track shows; the outcome (`done`) is not one.
 * Reaching `START_STEP` starts the import, so a step added before it keeps that order.
 */
const STEPS = [
  { id: "file", label: "File" },
  { id: "columns", label: "Columns" },
  { id: "properties", label: "New properties" },
  { id: "review", label: "Review" },
] as const;

export type ImportStep = (typeof STEPS)[number]["id"] | "done";

type StepDef = (typeof STEPS)[number];

/** The step whose arrival starts the import; the run's progress and preview show there. */
const START_STEP: ImportStep = "review";

/** The steps this import takes: New properties only while a column is queued for one or was created. */
function stepsFor(withProperties: boolean): readonly StepDef[] {
  return STEPS.filter((step) => withProperties || step.id !== "properties");
}

/** The step `offset` away along `order`, or `undefined` past either end or from the outcome. */
function stepAt(
  order: readonly ImportStep[],
  step: ImportStep,
  offset: number,
): ImportStep | undefined {
  const at = order.indexOf(step);
  return at < 0 ? undefined : order[at + offset];
}

const stepNumber = (order: readonly ImportStep[], step: ImportStep) =>
  step === "done" ? order.length + 1 : order.indexOf(step) + 1;

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

/**
 * Why the file cannot be sent: a chunk whose request would be over the server action body limit.
 * Checked before the import starts, so no chunk is refused or retried halfway through.
 */
function chunkProblem({ preview, rows }: CsvFile): string | null {
  const place = {
    chunkSize: IMPORT_CHUNK_ROWS,
    columns: preview.headers.length,
  };
  const oversized = firstOversizedChunk(rows, place, IMPORT_CHUNK_BODY_BYTES);
  if (!oversized) return null;
  const { firstRowNumber, lastRowNumber } = oversized;
  return `Rows ${firstRowNumber.toLocaleString()} to ${lastRowNumber.toLocaleString()} are too long to send together: over ${sizeLabel(IMPORT_CHUNK_BODY_BYTES)} in one request. Shorten the longest cells, or split the file.`;
}

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
    const problem = chunkProblem(read.value);
    if (problem) return Result.validationError(problem);
    const name = picked.name || "audience.csv";
    return Result.success({ name, ...read.value });
  } catch {
    return Result.validationError(UNREADABLE);
  }
}

type FileState = { file: LoadedFile | null; problem: string | null };

const fileStateOf = (read: Result<LoadedFile>): FileState =>
  Result.isError(read)
    ? { file: null, problem: read.message }
    : { file: read.value, problem: null };

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
    setState(fileStateOf(read));
    if (Result.isSuccess(read)) onRead(read.value);
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

/** Where the wizard is before the import starts, and the steps either side of it along `order`. */
function useImportSteps(order: readonly ImportStep[], onRestart: () => void) {
  const [step, setStep] = useState<ImportStep>(order[0]);
  const previous = stepAt(order, step, -1);
  return {
    step,
    order,
    next: stepAt(order, step, 1),
    setStep,
    back: previous ? () => setStep(previous) : undefined,
    /** Back to the first step with no file: a new import from the start. */
    restart: () => {
      onRestart();
      setStep(order[0]);
    },
  };
}

/** `columns` is the choices' map with the columns just mapped to new properties. */
function startRequest(
  file: LoadedFile,
  choices: ImportChoices,
  columns: ColumnMap,
): StartAudienceImportRequest {
  return {
    fileName: file.name,
    headers: file.preview.headers,
    rowCount: file.preview.rowCount,
    identifierColumn: choices.identifierColumn,
    propertyColumns: propertyColumnMap(columns),
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
  return isTerminal(view.status) && !view.canResume ? "done" : START_STEP;
}

/** What the footer's main button does on Review and the outcome, or `null` while it waits. */
function runAction(run: AudienceImportRun, close: () => void) {
  const view = runView(run);
  if (!view || run.state.kind === "uploading") return null;
  if (view.status === AudienceImportStatus.Checked)
    return confirmCount(view) > 0 ? run.confirm : null;
  if (view.canResume) return run.resume;
  if (run.canSendAgain) return run.sendAgain;
  // Done only closes: the outcome stays on screen while the panel animates out, and the next
  // open lets the ended import go and starts over.
  return isTerminal(view.status) ? close : null;
}

/** Whether the footer's main button may run: a file read, an identifier chosen, then the run's action. */
export function canContinue(wizard: ImportWizard): boolean {
  if (wizard.step === "file") return wizard.file !== null;
  if (wizard.step === "columns") return wizard.choices.identifierColumn !== "";
  if (wizard.step === "properties") return wizard.newProperties.canCreate;
  return wizard.runAction !== null;
}

/**
 * The run and the panel around it: opening the panel starts over unless an import is running, and
 * the panel opens by itself on the form's unfinished import.
 */
function useRunPanel(setup: ImportCsvSetup, startOver: () => void) {
  const opener = useRef<() => void>(() => undefined);
  const run = useAudienceImport(setup.formId, {
    onFound: () => opener.current(),
  });
  const panel = usePanelOpen(() => {
    const view = runView(run);
    if (view && !isTerminal(view.status)) return;
    if (view && !view.canResume) run.dismiss();
    startOver();
  }, run.pending);
  opener.current = () => panel.openChange(true);
  return { run, panel };
}

type Wizard = {
  file: LoadedFile | null;
  choices: ImportChoices;
  newProperties: NewProperties;
  steps: ReturnType<typeof useImportSteps>;
  run: AudienceImportRun;
  close: () => void;
};

/** Leaves a step before the start; arriving at New properties checks its names against the form. */
function nextStep({ steps, newProperties }: Wizard) {
  if (!steps.next) return;
  if (steps.next === "properties") newProperties.checkAll();
  steps.setStep(steps.next);
}

/** Creates the confirmed new properties, then starts the import with their columns mapped. */
async function startImport(wizard: Wizard, file: LoadedFile) {
  const { choices, steps, run, newProperties } = wizard;
  let columns = choices.columns;
  if (steps.step === "properties") {
    const created = await newProperties.create();
    if (!created) return;
    columns = { ...columns, ...created };
  }
  if (await run.start(startRequest(file, choices, columns), uploadFile(file)))
    steps.setStep(START_STEP);
}

/** The footer's main button: the next step, the start before Review, or the run's own action. */
async function advanceWizard(wizard: Wizard) {
  const { file, steps, run, close } = wizard;
  if (runStep(run)) return runAction(run, close)?.();
  if (steps.next !== START_STEP) return nextStep(wizard);
  if (file) await startImport(wizard, file);
}

/** Where the wizard is: the run's step once an import exists, else the local one with its Back. */
function stepState({ steps, run, newProperties }: Wizard) {
  const ran = runStep(run);
  const step = ran ?? steps.step;
  // A failed start's or create's message belongs to the step; going back to change a choice clears it.
  const back =
    steps.back &&
    (() => {
      run.dismiss();
      newProperties.clearError();
      steps.back?.();
    });
  return {
    step,
    stepNumber: stepNumber(steps.order, step),
    stepLabels: stepsFor(steps.order.includes("properties")).map(
      (s) => s.label,
    ),
    back: ran ? undefined : back,
  };
}

/** Reads a re-chosen file and continues the cut-off upload from it, or says why it cannot. */
async function continueWithFile(
  run: AudienceImportRun,
  picked: File,
  limits: AudienceImportLimits,
) {
  const read = await readFile(picked, limits);
  await run.continueWith(
    Result.isSuccess(read) ? Result.success(uploadFile(read.value)) : read,
  );
}

/** The footer's action, the run's pending and error, and the re-chosen file, for the panel. */
function runControls(wizard: Wizard, limits: AudienceImportLimits) {
  const { run, close, newProperties } = wizard;
  return {
    runAction: runAction(run, close),
    pending: run.pending || newProperties.creating,
    error: newProperties.error ?? run.error,
    advance: () => advanceWizard(wizard),
    continueWith: (picked: File) => continueWithFile(run, picked, limits),
    // The stopped import is canceled first; a refused cancel keeps it on screen with the error.
    startNew: async () => {
      const view = run.state.kind === "server" ? run.state.view : null;
      if (view?.canResume && !(await run.cancel())) return;
      run.dismiss();
      wizard.steps.restart();
    },
  };
}

/** The form's properties with the ones this wizard created, which the page may not show yet. */
function withCreated(
  properties: readonly AudienceProperty[],
  created: readonly AudienceProperty[],
): AudienceProperty[] {
  const known = new Set(properties.map((property) => property.id));
  return [...properties, ...created.filter((p) => !known.has(p.id))];
}

/** The New properties step's drafts for the columns queued on the Columns step. */
function useQueuedProperties(
  setup: ImportCsvSetup,
  file: LoadedFile | null,
  choices: ImportChoices,
) {
  const [created, setCreated] = useState<AudienceProperty[]>([]);
  const properties = withCreated(setup.properties, created);
  const newProperties = useNewProperties({
    formId: setup.formId,
    file,
    queued: queuedColumns(file?.preview.headers ?? [], choices.columns),
    properties,
    onCreated: (column, property) => {
      setCreated((current) => [...current, property]);
      choices.setColumn(column, property.variableName);
    },
  });
  const reset = () => {
    setCreated([]);
    newProperties.reset();
  };
  const withStep = newProperties.drafts.length > 0 || created.length > 0;
  return { newProperties, properties, created, withStep, reset };
}

/**
 * The Import participants wizard: file → columns → new properties → review → outcome, in one panel.
 * Leaving New properties creates the confirmed properties, then starts a staged import and uploads
 * the file (from Columns when no column is queued); no participant is written before Confirm.
 * A running import outlives the panel: closing it keeps the import, and the panel opens on it.
 */
export function useImportCsv(setup: ImportCsvSetup) {
  const choices = useColumnChoices(setup);
  const { reset, ...source } = useImportFile(setup.importLimits, (file) =>
    choices.suggest(file.preview.headers),
  );
  const queued = useQueuedProperties(setup, source.file, choices);
  const order = stepsFor(queued.withStep).map((step) => step.id);
  const steps = useImportSteps(order, () => {
    reset();
    queued.reset();
  });
  const { run, panel } = useRunPanel(setup, steps.restart);
  const { newProperties } = queued;
  const wizard = {
    file: source.file,
    choices,
    newProperties,
    steps,
    run,
    close: panel.close,
  };
  return {
    ...source,
    ...panel,
    ...stepState(wizard),
    choices,
    newProperties,
    properties: queued.properties,
    createdProperties: queued.created,
    run,
    ...runControls(wizard, setup.importLimits),
  };
}

export type ImportWizard = ReturnType<typeof useImportCsv>;
