"use client";

import { ClipboardCheck, Info, TriangleAlert } from "lucide-react";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { PanelSection } from "@/components/common/panel-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AudienceImportStatus,
  type AudienceIdentifierKind,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { identifierKindLabel } from "../../utils";
import { canCancel, rowsSent } from "../import-run";
import { checkCounts, rowCountLabel } from "../import-labels";
import { runView, type ImportWizard } from "../use-import-csv.hook";
import { RejectedRows } from "./import-result-summary";

type ReviewProps = {
  wizard: ImportWizard;
  identifierKind: AudienceIdentifierKind;
};

type Phase = { title: string; done: number; of: number; unit: string };

/** Rows the write will take: the Check's accepted rows, once it has counted them. */
function acceptedRows(view: AudienceImportView): number {
  return view.check
    ? view.check.newCount + view.check.existingCount
    : view.upload.rowCount;
}

/** How far the phase the import is in got, or `null` once there is nothing to wait for. */
function phaseOf(wizard: ImportWizard, view: AudienceImportView): Phase | null {
  const { state } = wizard.run;
  const rows = view.upload.rowCount;
  if (state.kind === "uploading")
    return { title: "Sending the file", done: state.sent, of: rows, unit: "sent" };
  if (view.status === AudienceImportStatus.Checking)
    return { title: "Checking rows", done: view.checkedRowCount, of: rows, unit: "checked" };
  if (view.status === AudienceImportStatus.Writing)
    return {
      title: "Writing participants",
      done: view.written.writtenRowCount,
      of: acceptedRows(view),
      unit: "written",
    };
  return null;
}

function PhaseProgress({ phase }: Readonly<{ phase: Phase }>) {
  const percent = phase.of > 0 ? Math.round((phase.done / phase.of) * 100) : 0;
  return (
    <div className="grid gap-2">
      <Progress value={percent} aria-label={phase.title} />
      <p className="text-sm tabular-nums text-muted-foreground">
        {phase.done.toLocaleString()} of {phase.of.toLocaleString()} rows {phase.unit}
      </p>
    </div>
  );
}

const REPICK_ID = "import-repick";

/** An upload this tab cannot finish from memory: the scripter chooses the same file again. */
function ChooseAgain({ wizard, view }: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  return (
    <FieldWithHelp
      id={REPICK_ID}
      label="CSV file"
      help={`The upload stopped before the whole file was sent (${rowsSent(view).toLocaleString()} of ${view.upload.rowCount.toLocaleString()} rows). Choose ${view.fileName} again to continue it.`}
    >
      <Input
        id={REPICK_ID}
        type="file"
        accept=".csv,text/csv"
        aria-describedby={helpId(REPICK_ID)}
        disabled={wizard.pending}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          if (picked) void wizard.continueWith(picked);
        }}
      />
    </FieldWithHelp>
  );
}

const UPDATE_NOTE = {
  title: "Existing participants are updated",
  body: "A participant already here gets the file's values, and an empty cell keeps the value they have.",
};
const TEST_NOTE = {
  title: "Existing participants are skipped",
  body: "Only participants new to this form are added, as test participants. A participant already here is skipped and keeps their values.",
};

/** The consequence, once: how a row meets the participants already here (DESIGN.md §6). */
function MatchingNote({ view, identifierKind }: Readonly<{ view: AudienceImportView; identifierKind: AudienceIdentifierKind }>) {
  const matchedBy = identifierKindLabel(identifierKind).toLowerCase();
  const note = view.isTest ? TEST_NOTE : UPDATE_NOTE;
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>{note.title}</AlertTitle>
      <AlertDescription>
        Rows are matched by {matchedBy}. {note.body} A rejected row is left
        out, and the other rows still import.
      </AlertDescription>
    </Alert>
  );
}

function StoppedAlert({ view }: Readonly<{ view: AudienceImportView }>) {
  return (
    <Alert variant="warning">
      <TriangleAlert />
      <AlertTitle>The import stopped</AlertTitle>
      <AlertDescription>
        {view.failure ?? "The write stopped before it finished."} Resume
        continues from where it stopped, and writes each participant once.
      </AlertDescription>
    </Alert>
  );
}

function CancelImport({ wizard, view }: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  if (!canCancel(view.status)) return null;
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={wizard.pending}
        onClick={() => void wizard.run.cancel()}
      >
        Cancel import
      </Button>
    </div>
  );
}

function sectionDescription(view: AudienceImportView): string {
  return `${view.fileName} · ${rowCountLabel(view.upload.rowCount)}`;
}

function ImportBody({ wizard, view }: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  const phase = phaseOf(wizard, view);
  if (phase) return <PhaseProgress phase={phase} />;
  if (view.status === AudienceImportStatus.Uploading && !wizard.run.canSendAgain)
    return <ChooseAgain wizard={wizard} view={view} />;
  if (view.check) return <p className="text-sm">{checkCounts(view.check)}</p>;
  return null;
}

/** Step 3: the import's upload and Check as they run, then the preview to confirm. */
export function ImportReviewStep({ wizard, identifierKind }: Readonly<ReviewProps>) {
  const view = runView(wizard.run);
  if (!view) return null;
  const checked = view.status === AudienceImportStatus.Checked;
  return (
    <>
      {wizard.run.notice ? (
        <Alert variant="info">
          <Info />
          <AlertDescription>{wizard.run.notice}</AlertDescription>
        </Alert>
      ) : null}
      {view.canResume ? <StoppedAlert view={view} /> : null}
      <PanelSection
        icon={ClipboardCheck}
        title={phaseOf(wizard, view)?.title ?? "Review"}
        description={sectionDescription(view)}
      >
        <ImportBody wizard={wizard} view={view} />
        <CancelImport wizard={wizard} view={view} />
      </PanelSection>
      {checked ? (
        <>
          <RejectedRows
            rejections={view.rejections}
            rejectedCount={view.check?.rejectedCount ?? 0}
          />
          <MatchingNote view={view} identifierKind={identifierKind} />
        </>
      ) : null}
    </>
  );
}
