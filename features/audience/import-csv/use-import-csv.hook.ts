"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AudienceIdentifierKind,
  AudienceImportResult,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { usePanelOpen } from "../use-panel-state.hook";
import {
  importAudienceCsvAction,
  type ImportAudienceCsvInput,
} from "./import-audience-csv.action";
import { readCsvPreview, type CsvPreview } from "./csv-preview";
import {
  propertyColumnMap,
  SKIP_COLUMN,
  suggestColumnChoices,
  type ColumnMap,
} from "./column-map";

/** Steps before the import runs; the outcome (`done`) is not a step of the track. */
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
};

export type LoadedFile = { name: string; text: string; preview: CsvPreview };

const NO_FILE: FileState = { file: null, problem: null };
const NO_CHOICES: ChoiceState = {
  identifierColumn: "",
  suggestedIdentifier: "",
  columns: {},
};
const UNREADABLE = "The file could not be read. Save it as CSV and try again.";
const REJECTED = "Something went wrong. Try again.";

async function readFile(picked: File): Promise<Result<LoadedFile>> {
  try {
    const text = await picked.text();
    const preview = readCsvPreview(text);
    if (Result.isError(preview)) return preview;
    const name = picked.name || "audience.csv";
    return Result.success({ name, text, preview: preview.value });
  } catch {
    return Result.validationError(UNREADABLE);
  }
}

type FileState = { file: LoadedFile | null; problem: string | null };

/** The chosen file and its preview, or why it cannot be imported; `onRead` gets its headers. */
function useImportFile(onRead: (headers: string[]) => void) {
  const [state, setState] = useState<FileState>(NO_FILE);
  const generation = useRef(0);
  const pick = async (picked: File) => {
    const current = ++generation.current;
    const read = await readFile(picked);
    if (current !== generation.current) return;
    if (Result.isError(read))
      return setState({ file: null, problem: read.message });
    setState({ file: read.value, problem: null });
    onRead(read.value.preview.headers);
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
};

function withColumn(
  state: ChoiceState,
  column: string,
  variableName: string,
): ChoiceState {
  return { ...state, columns: { ...state.columns, [column]: variableName } };
}

/** The identifier column feeds no property: it is the person, not one of their values. */
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
  };
}

/** Which column identifies people, which one was suggested, and what each other column feeds. */
function useColumnChoices(setup: ImportCsvSetup) {
  const [state, setState] = useState<ChoiceState>(NO_CHOICES);
  return {
    ...state,
    suggest: (headers: string[]) => setState(suggestedChoices(headers, setup)),
    setColumn: (column: string, variableName: string) =>
      setState((current) => withColumn(current, column, variableName)),
    chooseIdentifier: (column: string) =>
      setState((current) => withIdentifier(current, column)),
  };
}

export type ImportChoices = ReturnType<typeof useColumnChoices>;

async function importOrFailure(input: ImportAudienceCsvInput) {
  try {
    return await importAudienceCsvAction(input);
  } catch {
    return Result.error<AudienceImportResult>(REJECTED);
  }
}

type WriteOutcome = {
  error: string | null;
  result: AudienceImportResult | null;
};
const NOT_RUN: WriteOutcome = { error: null, result: null };

/**
 * The one write. A failure stays in `error` on the review step, which keeps every choice; a
 * success is shown in the panel (not a toast) and refreshes the list behind it.
 */
function useImportWrite() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<WriteOutcome>(NOT_RUN);
  const run = (input: ImportAudienceCsvInput, onDone: () => void) => {
    setOutcome(NOT_RUN);
    startTransition(async () => {
      const imported = await importOrFailure(input);
      if (Result.isError(imported))
        return setOutcome({ error: imported.message, result: null });
      setOutcome({ error: null, result: imported.value });
      onDone();
      router.refresh();
    });
  };
  return { pending, ...outcome, run, reset: () => setOutcome(NOT_RUN) };
}

/** Where the wizard is, and the steps either side of it; `onBack` runs before each step back. */
function useImportSteps(onBack: () => void) {
  const [step, setStep] = useState<ImportStep>("file");
  const previous = PREVIOUS[step];
  const back = () => {
    onBack();
    if (previous) setStep(previous);
  };
  return {
    step,
    stepNumber: STEP_NUMBER[step],
    next: NEXT[step],
    setStep,
    back: previous ? back : undefined,
  };
}

function importInput(
  setup: ImportCsvSetup,
  file: LoadedFile,
  choices: ImportChoices,
): ImportAudienceCsvInput {
  return {
    formId: setup.formId,
    csvText: file.text,
    fileName: file.name,
    identifierColumn: choices.identifierColumn,
    propertyColumns: propertyColumnMap(choices.columns),
  };
}

/** Whether the footer's main button may run: a file read, then an identifier chosen. */
export function canContinue({ step, file, choices }: ImportWizard): boolean {
  if (step === "file") return file !== null;
  if (step === "columns") return choices.identifierColumn !== "";
  return true;
}

/**
 * The Import people wizard: file → columns → review → outcome, in one panel. Opening it starts
 * over; nothing is written before the review step's Import.
 */
export function useImportCsv(setup: ImportCsvSetup) {
  const choices = useColumnChoices(setup);
  const { reset: resetFile, ...source } = useImportFile(choices.suggest);
  const { run, reset, ...write } = useImportWrite();
  // A failed import's message belongs to the review step; going back to change a choice clears it.
  const { next, setStep, ...steps } = useImportSteps(reset);
  const panel = usePanelOpen(() => {
    resetFile();
    reset();
    setStep("file");
  }, write.pending);
  const advance = () => {
    if (next) return setStep(next);
    if (steps.step !== "review" || !source.file) return panel.close();
    run(importInput(setup, source.file, choices), () => setStep("done"));
  };
  return { ...steps, ...write, ...source, ...panel, choices, advance };
}

export type ImportWizard = ReturnType<typeof useImportCsv>;
