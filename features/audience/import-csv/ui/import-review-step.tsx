"use client";

import { ClipboardCheck, Info, ListChecks, TriangleAlert } from "lucide-react";
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
import { canCancel, rowsSent, updateCount } from "../import-run";
import { importOptionsOf } from "../overwrite-rules";
import { checkCounts, outcomeCounts, rowCountLabel } from "../import-labels";
import { runView, type ImportWizard } from "../use-import-csv.hook";
import { RejectedRows } from "./import-result-summary";
import { OverwriteRulesSummary } from "./overwrite-rules-fields";
import { StoppedImport } from "./stopped-import";
import { TestPersonCheckbox } from "../../ui/test-person-checkbox";

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

type PhaseName = { title: string; unit: string };

const SENDING: PhaseName = { title: "Sending the file", unit: "sent" };
const CHECKING: PhaseName = { title: "Checking rows", unit: "checked" };
const WRITING: PhaseName = { title: "Writing participants", unit: "written" };

const phase = (name: PhaseName, done: number, of: number): Phase => ({
  ...name,
  done,
  of,
});

/** The server's phases worth a counter, by status. */
const SERVER_PHASES: Record<string, (view: AudienceImportView) => Phase> = {
  [AudienceImportStatus.Checking]: (view) =>
    phase(CHECKING, view.checkedRowCount, view.upload.rowCount),
  [AudienceImportStatus.Writing]: (view) =>
    phase(WRITING, view.written.writtenRowCount, acceptedRows(view)),
};

/** How far the phase the import is in got, or `null` once there is nothing to wait for. */
function phaseOf(wizard: ImportWizard, view: AudienceImportView): Phase | null {
  const { state } = wizard.run;
  if (state.kind === "uploading")
    return phase(SENDING, state.sent, view.upload.rowCount);
  return SERVER_PHASES[view.status]?.(view) ?? null;
}

/** What the write has done so far, zeros left out, once it has written a row. */
function WrittenSoFar({ view }: Readonly<{ view: AudienceImportView }>) {
  const { written, isTest, status } = view;
  if (status !== AudienceImportStatus.Writing || written.writtenRowCount === 0)
    return null;
  return (
    <p className="text-sm">
      {outcomeCounts(written, { asTest: isTest })} so far
    </p>
  );
}

function PhaseProgress({ phase }: Readonly<{ phase: Phase }>) {
  const percent = phase.of > 0 ? Math.round((phase.done / phase.of) * 100) : 0;
  return (
    <div className="grid gap-2">
      <Progress value={percent} aria-label={phase.title} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {phase.done.toLocaleString()} of {phase.of.toLocaleString()} rows{" "}
        {phase.unit}
      </p>
    </div>
  );
}

const REPICK_ID = "import-repick";

function chooseAgainHelp(view: AudienceImportView): string {
  const sent = `${rowsSent(view).toLocaleString()} of ${view.upload.rowCount.toLocaleString()} rows`;
  return `The upload stopped before the whole file was sent (${sent}). Choose ${view.fileName} again to continue it.`;
}

/** An upload this tab cannot finish from memory: the scripter chooses the same file again. */
function ChooseAgain({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  return (
    <FieldWithHelp id={REPICK_ID} label="CSV file" help={chooseAgainHelp(view)}>
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
  body: "A participant already here gets the file's values, as chosen below.",
};
const TEST_NOTE = {
  title: "Existing participants are skipped",
  body: "Only participants new to this form are added, as test participants. A participant already here is skipped and keeps their values.",
};

/** The consequence, once: how a row meets the participants already here (DESIGN.md §6). */
function MatchingNote({
  view,
  identifierKind,
}: Readonly<{
  view: AudienceImportView;
  identifierKind: AudienceIdentifierKind;
}>) {
  const matchedBy = identifierKindLabel(identifierKind).toLowerCase();
  const note = view.isTest ? TEST_NOTE : UPDATE_NOTE;
  return (
    <Alert variant="info">
      <Info />
      <AlertTitle>{note.title}</AlertTitle>
      <AlertDescription>
        Rows are matched by {matchedBy}. {note.body} A rejected row is left out,
        and the other rows still import.
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

function CancelImport({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
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

function ImportBody({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  const phase = phaseOf(wizard, view);
  if (phase) return <PhaseProgress phase={phase} />;
  if (
    view.status === AudienceImportStatus.Uploading &&
    !wizard.run.canSendAgain
  )
    return <ChooseAgain wizard={wizard} view={view} />;
  if (view.check) return <p className="text-sm">{checkCounts(view.check)}</p>;
  return null;
}

function Notice({ notice }: Readonly<{ notice: string | null }>) {
  if (!notice) return null;
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription>{notice}</AlertDescription>
    </Alert>
  );
}

const ACKNOWLEDGE_ID = "import-acknowledge";

/** D7: the scripter says they know how many participants Import overwrites. */
function Acknowledgement({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  const count = updateCount(view);
  if (count === 0) return null;
  const records =
    count === 1 ? "1 record" : `${count.toLocaleString()} records`;
  return (
    <TestPersonCheckbox
      id={ACKNOWLEDGE_ID}
      label={`I understand ${records} will be updated and this cannot be undone`}
      help="Import stays off until this is ticked."
      checked={wizard.acknowledged === view.importId}
      disabled={wizard.pending}
      onCheckedChange={(ticked) => wizard.acknowledge(view.importId, ticked)}
    />
  );
}

function BackToChange({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={wizard.pending}
      onClick={() => void wizard.backToChange()}
    >
      Back to change
    </Button>
  );
}

/**
 * What the write does to participants already here, as chosen on Columns and now fixed; Back to
 * change cancels this import so a new one starts with other choices. A test import overwrites
 * nothing, so it has none of this.
 */
function BeforeImport({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  if (view.isTest) return null;
  return (
    <PanelSection
      icon={ListChecks}
      title="Before you import"
      description="Chosen on the Columns step for participants already on this form."
      aside={<BackToChange wizard={wizard} />}
    >
      <OverwriteRulesSummary options={importOptionsOf(view)} />
      <Acknowledgement wizard={wizard} view={view} />
    </PanelSection>
  );
}

/** The Check's preview: the rows it rejected, how a row meets the participants already here, and the choices. */
function CheckedDetails({
  wizard,
  view,
  identifierKind,
}: Readonly<ReviewProps & { view: AudienceImportView }>) {
  if (view.status !== AudienceImportStatus.Checked) return null;
  return (
    <>
      <RejectedRows
        rejections={view.rejections}
        rejectedCount={view.check?.rejectedCount ?? 0}
      />
      <MatchingNote view={view} identifierKind={identifierKind} />
      <BeforeImport wizard={wizard} view={view} />
    </>
  );
}

/** The import's file, its progress or preview, and Cancel while nothing is written. */
function ProgressSection({
  wizard,
  view,
}: Readonly<{ wizard: ImportWizard; view: AudienceImportView }>) {
  return (
    <PanelSection
      icon={ClipboardCheck}
      title={phaseOf(wizard, view)?.title ?? "Review"}
      description={sectionDescription(view)}
    >
      <ImportBody wizard={wizard} view={view} />
      <WrittenSoFar view={view} />
      <CancelImport wizard={wizard} view={view} />
    </PanelSection>
  );
}

/** Step 3: the import's upload and Check as they run, then the preview to confirm. */
export function ImportReviewStep({
  wizard,
  identifierKind,
}: Readonly<ReviewProps>) {
  const view = runView(wizard.run);
  if (!view) return null;
  return (
    <>
      <Notice notice={wizard.run.notice} />
      {view.canResume ? (
        <StoppedImport wizard={wizard}>
          <StoppedAlert view={view} />
        </StoppedImport>
      ) : null}
      <ProgressSection wizard={wizard} view={view} />
      <CheckedDetails {...{ wizard, view, identifierKind }} />
    </>
  );
}
