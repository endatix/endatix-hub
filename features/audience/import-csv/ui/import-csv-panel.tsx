"use client";

import { Upload } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSteps } from "@/components/common/panel-steps";
import { Button } from "@/components/ui/button";
import {
  AudienceImportStatus,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { confirmCount, isTerminal } from "../import-run";
import { participantCountLabel } from "../import-labels";
import {
  canContinue,
  IMPORT_STEPS,
  runView,
  useImportCsv,
  type ImportCsvSetup,
  type ImportWizard,
} from "../use-import-csv.hook";
import { ImportColumnsStep } from "./import-columns-step";
import { ImportFileStep } from "./import-file-step";
import { ImportResultSummary } from "./import-result-summary";
import { ImportReviewStep } from "./import-review-step";

function triggerLabel(view: AudienceImportView | null): string {
  if (view?.canResume) return "Import stopped";
  return view && !isTerminal(view.status) ? "Import in progress" : "Import CSV";
}

/** While an import is unfinished or stopped the trigger says so; the panel opens on it. */
function trigger(view: AudienceImportView | null) {
  return (
    <Button variant="outline">
      <Upload />
      {triggerLabel(view)}
    </Button>
  );
}

const STEP_DESCRIPTION = {
  file: "Add participants from a CSV file. Nothing is written until you confirm.",
  columns:
    "Choose the column that identifies participants and what the others fill. Continue sends the file and checks it.",
} as const;

const KEEPS_GOING =
  "You can close this panel or this tab: the import keeps going.";

/** What the server is doing, by status; `background` is whether it goes on without this tab. */
const STATUS_DESCRIPTION: Record<string, (background: boolean) => string> = {
  [AudienceImportStatus.Uploading]: () =>
    "The upload stopped before the whole file was sent.",
  [AudienceImportStatus.Checking]: (background) =>
    background
      ? `The rows are being checked. Nothing is written yet. ${KEEPS_GOING}`
      : "The rows are being checked. Nothing is written yet.",
  [AudienceImportStatus.Checked]: () =>
    "This is what the import will do. Nothing is written until you import.",
  [AudienceImportStatus.Writing]: (background) =>
    background
      ? `Writing participants. ${KEEPS_GOING}`
      : "Writing participants. Keep this tab open until it finishes.",
  [AudienceImportStatus.Completed]: () =>
    "The import has finished. The Participants list behind this panel is up to date.",
};

function runningDescription(
  wizard: ImportWizard,
  view: AudienceImportView,
): string {
  if (wizard.run.state.kind === "uploading")
    return "Sending the file. Keep this tab open until it is sent.";
  const describe = STATUS_DESCRIPTION[view.status];
  if (describe) return describe(view.runsInBackground);
  if (view.canResume) return "The import stopped before it finished.";
  return "The import has ended.";
}

/** One sentence for the step, or for the running import, announced as it changes. */
function ImportDescription({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  const view = runView(wizard.run);
  let text: string;
  if (view === null) {
    const step = wizard.step === "columns" ? "columns" : "file";
    text = STEP_DESCRIPTION[step];
  } else {
    text = runningDescription(wizard, view);
  }
  return <span aria-live="polite">{text}</span>;
}

function submitLabel(wizard: ImportWizard): string {
  const view = runView(wizard.run);
  if (!view) return "Continue";
  if (wizard.step === "done") return "Done";
  if (view.canResume) return "Resume import";
  if (wizard.run.canSendAgain) return "Send the rest of the file";
  if (view.status !== AudienceImportStatus.Checked)
    return "Import participants";
  return `Import ${participantCountLabel(confirmCount(view))}`;
}

type BodyProps = { wizard: ImportWizard; setup: ImportCsvSetup };

function ActiveStep({ wizard, setup }: Readonly<BodyProps>) {
  const { step, file } = wizard;
  const view = runView(wizard.run);
  if (step === "done") return view && <ImportResultSummary view={view} />;
  if (step === "review")
    return (
      <ImportReviewStep wizard={wizard} identifierKind={setup.identifierKind} />
    );
  if (step === "file" || !file)
    return <ImportFileStep wizard={wizard} limits={setup.importLimits} />;
  return <ImportColumnsStep wizard={wizard} setup={setup} file={file} />;
}

const PANEL = {
  desktopType: "complex",
  title: "Import participants",
  errorTitle: "The import needs attention",
} as const;

/** What `PanelForm` shows for the wizard's current step. */
function stepProps(wizard: ImportWizard) {
  const running = runView(wizard.run) !== null;
  return {
    open: wizard.open,
    onOpenChange: wizard.openChange,
    trigger: trigger(runView(wizard.run)),
    pending: wizard.pending,
    pendingLabel: wizard.step === "columns" ? "Starting…" : "Working…",
    error: wizard.error,
    description: <ImportDescription wizard={wizard} />,
    submitLabel: submitLabel(wizard),
    submitDisabled: !canContinue(wizard),
    onBack: wizard.back,
    cancelable: wizard.step !== "done",
    cancelLabel: running ? "Close" : undefined,
    onSubmit: () => void wizard.advance(),
  };
}

/**
 * Import participants from a CSV (DESIGN.md §6 Recipe: create / edit overlay, Steps in a panel):
 * file, columns, then Review follows the upload and the Check, and the outcome shows in place.
 * Closing the panel never cancels: Cancel import does, until the import is confirmed.
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
