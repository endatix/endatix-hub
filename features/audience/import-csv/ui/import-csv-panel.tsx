"use client";

import { Upload } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSteps } from "@/components/common/panel-steps";
import { Button } from "@/components/ui/button";
import { rowCountLabel } from "../import-labels";
import {
  canContinue,
  IMPORT_STEPS,
  useImportCsv,
  type ImportCsvSetup,
  type ImportStep,
  type ImportWizard,
} from "../use-import-csv.hook";
import { ImportColumnsStep } from "./import-columns-step";
import { ImportFileStep } from "./import-file-step";
import { ImportResultSummary } from "./import-result-summary";
import { ImportReviewStep } from "./import-review-step";

const TRIGGER = (
  <Button variant="outline">
    <Upload />
    Import CSV
  </Button>
);

const STEP_DESCRIPTION: Record<ImportStep, string> = {
  file: "Add people from a CSV file. Nothing is written until you confirm.",
  columns: "Choose the column that identifies people and what the others fill.",
  review: "Check what the import will do, then run it.",
  done: "The import has finished. The People list behind this panel is up to date.",
};

/** One sentence for the step, or for the running import, announced as it changes. */
function ImportDescription({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  const rows = wizard.file ? rowCountLabel(wizard.file.preview.rowCount) : "";
  return (
    <span aria-live="polite">
      {wizard.pending
        ? `Importing ${rows}. Keep this panel open until it finishes.`
        : STEP_DESCRIPTION[wizard.step]}
    </span>
  );
}

function submitLabel(wizard: ImportWizard): string {
  if (wizard.step === "done") return "Done";
  if (wizard.step !== "review" || !wizard.file) return "Continue";
  return `Import ${rowCountLabel(wizard.file.preview.rowCount)}`;
}

type BodyProps = { wizard: ImportWizard; setup: ImportCsvSetup };

function ActiveStep({ wizard, setup }: Readonly<BodyProps>) {
  const { step, file, result } = wizard;
  if (step === "done")
    return (
      result && (
        <ImportResultSummary result={result} asTest={wizard.choices.asTest} />
      )
    );
  if (step === "file" || !file) return <ImportFileStep wizard={wizard} />;
  const props = { wizard, setup, file };
  return step === "columns" ? (
    <ImportColumnsStep {...props} />
  ) : (
    <ImportReviewStep {...props} />
  );
}

const PANEL = {
  desktopType: "complex",
  trigger: TRIGGER,
  title: "Import people",
  errorTitle: "Import failed",
  pendingLabel: "Importing…",
} as const;

/** What `PanelForm` shows for the wizard's current step. */
function stepProps(wizard: ImportWizard) {
  return {
    open: wizard.open,
    onOpenChange: wizard.openChange,
    pending: wizard.pending,
    error: wizard.error,
    description: <ImportDescription wizard={wizard} />,
    submitLabel: submitLabel(wizard),
    submitDisabled: !canContinue(wizard),
    onBack: wizard.back,
    cancelable: wizard.step !== "done",
    onSubmit: wizard.advance,
  };
}

/**
 * Import people from a CSV (DESIGN.md §6 Recipe: create / edit overlay, Steps in a panel): file,
 * columns, review, then the outcome in place. The panel locks while the import runs.
 */
export function ImportCsvPanel(setup: Readonly<ImportCsvSetup>) {
  const wizard = useImportCsv(setup);
  return (
    <PanelForm {...PANEL} {...stepProps(wizard)}>
      {wizard.step === "done" ? null : (
        <PanelSteps steps={IMPORT_STEPS} current={wizard.stepNumber} />
      )}
      <ActiveStep wizard={wizard} setup={setup} />
    </PanelForm>
  );
}
