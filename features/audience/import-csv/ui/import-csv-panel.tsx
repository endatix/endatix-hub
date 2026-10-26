"use client";

import { Upload } from "lucide-react";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSteps } from "@/components/common/panel-steps";
import { Button } from "@/components/ui/button";
import {
  AudienceImportStatus,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { isTerminal } from "../import-run";
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

/** While an import is unfinished the trigger says so; the panel opens on it. */
function trigger(view: AudienceImportView | null) {
  const running = view !== null && !isTerminal(view.status);
  return (
    <Button variant="outline">
      <Upload />
      {running ? "Import in progress" : "Import CSV"}
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
    `The rows are being checked. Nothing is written yet.${background ? ` ${KEEPS_GOING}` : ""}`,
  [AudienceImportStatus.Checked]: () =>
    "This is what the import will do. Nothing is written until you import.",
  [AudienceImportStatus.Writing]: (background) =>
    background
      ? `Writing participants. ${KEEPS_GOING}`
      : "Writing participants. Keep this panel open until it finishes.",
};

function runningDescription(
  wizard: ImportWizard,
  view: AudienceImportView,
): string {
  if (wizard.run.state.kind === "uploading")
    return "Sending the file. Keep this tab open until it is sent.";
  const describe = STATUS_DESCRIPTION[view.status];
  if (describe) return describe(view.runsInBackground);
  return view.canResume
    ? "The import stopped before it finished."
    : "The import has ended. The People list behind this panel is up to date.";
}

/** One sentence for the step, or for the running import, announced as it changes. */
function ImportDescription({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  const view = runView(wizard.run);
  const text =
    view === null
      ? STEP_DESCRIPTION[wizard.step === "columns" ? "columns" : "file"]
      : runningDescription(wizard, view);
  return <span aria-live="polite">{text}</span>;
}

function submitLabel(wizard: ImportWizard): string {
  const view = runView(wizard.run);
  if (!view) return "Continue";
  if (wizard.step === "done") return "Done";
  if (view.canResume) return "Resume import";
  if (wizard.run.canSendAgain) return "Send the rest of the file";
  if (view.status !== AudienceImportStatus.Checked || !view.check)
    return "Import participants";
  const { newCount, existingCount } = view.check;
  return `Import ${participantCountLabel(newCount + existingCount)}`;
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
  errorTitle: "Import failed",
} as const;

/** What `PanelForm` shows for the wizard's current step. */
function stepProps(wizard: ImportWizard) {
  const running = runView(wizard.run) !== null;
  return {
    open: wizard.open,
    onOpenChange: wizard.openChange,
    trigger: trigger(runView(wizard.run)),
    pending: wizard.pending,
    pendingLabel: wizard.step === "columns" ? "Starting…" : "Saving…",
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
