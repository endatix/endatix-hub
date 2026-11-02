"use client";

import {
  Ban,
  CircleCheckBig,
  CircleX,
  FileWarning,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { DownloadMenu } from "@/components/common/download-menu";
import { PanelSection } from "@/components/common/panel-section";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  StaticDataTable,
  StaticDataTableRow,
  dataTableCell,
} from "@/components/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AudienceImportStatus,
  type AudienceImportRejection,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { outcomeCounts } from "../import-labels";
import {
  useRejectedRowsDownload,
  type DownloadMessage,
} from "../use-rejected-rows-download.hook";

type ViewProps = { view: AudienceImportView };

const REJECTION_COLUMNS = [
  { key: "row", label: "Row", className: DATA_TABLE_SHRINK_WRAP_CLASS_NAME },
  { key: "reason", label: "Reason" },
] as const;

/** A batch with rejected rows is `warning`, never `success` (DESIGN.md §5 Status vocabulary). */
function CompletedAlert({ view }: Readonly<ViewProps>) {
  const { written, isTest } = view;
  const clean = written.rejectedCount === 0;
  const Icon = clean ? CircleCheckBig : TriangleAlert;
  return (
    <Alert variant={clean ? "success" : "warning"}>
      <Icon />
      <AlertTitle>
        {clean ? "Import finished" : "Import finished with rejected rows"}
      </AlertTitle>
      <AlertDescription>
        {outcomeCounts(written, { asTest: isTest })}.{" "}
        {clean
          ? "The Participants list shows them."
          : "Fix the rejected rows in the file and import it again: participants already imported are matched, not added twice."}
      </AlertDescription>
    </Alert>
  );
}

type Ending = { title: string; body: string; failed?: boolean };

/** Why an import that did not complete ended; nothing was written unless it failed mid-write. */
function endingOf(view: AudienceImportView): Ending {
  if (view.status === AudienceImportStatus.Canceled)
    return { title: "Import canceled", body: "Nothing was written." };
  if (view.status === AudienceImportStatus.Expired)
    return {
      title: "Import expired",
      body: "It waited too long to be confirmed, so nothing was written. Import the file again.",
    };
  if (view.status === AudienceImportStatus.Failed)
    return {
      title: "Import failed",
      body:
        view.failure ?? "The import could not finish. Import the file again.",
      failed: true,
    };
  return {
    title: "Import ended",
    body: "Reload the page to see where it stands.",
  };
}

function EndedAlert({ view }: Readonly<ViewProps>) {
  const { title, body, failed } = endingOf(view);
  const Icon = failed ? CircleX : Ban;
  return (
    <Alert variant={failed ? "destructive" : "info"}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{body}</AlertDescription>
    </Alert>
  );
}

type RejectionsProps = {
  rejections: AudienceImportRejection[];
  rejectedCount: number;
  /** An action beside the title, such as the download of every rejected row. */
  aside?: ReactNode;
};

function rejectionsDescription({ rejections, rejectedCount }: RejectionsProps) {
  if (rejections.length === 0)
    return `${rejectedCount.toLocaleString()} rows. Download them to see each one.`;
  return rejections.length < rejectedCount
    ? `The first ${rejections.length} of ${rejectedCount.toLocaleString()}, by their row in the file.`
    : "By their row in the file.";
}

function rejectionCells(rejection: AudienceImportRejection) {
  return [
    dataTableCell("row", rejection.rowNumber, "tabular-nums"),
    dataTableCell("reason", rejection.reason, "whitespace-normal"),
  ];
}

function RejectionsTable({
  rejections,
}: Readonly<{ rejections: AudienceImportRejection[] }>) {
  return (
    <StaticDataTable columns={REJECTION_COLUMNS}>
      {rejections.map((rejection, index) => (
        <StaticDataTableRow
          key={rejection.rowNumber}
          index={index}
          cells={rejectionCells(rejection)}
        />
      ))}
    </StaticDataTable>
  );
}

/** The first rejected rows, by their row in the file. */
export function RejectedRows({ aside, ...props }: Readonly<RejectionsProps>) {
  if (props.rejections.length === 0 && !aside) return null;
  const description = rejectionsDescription(props);
  return (
    <PanelSection
      icon={FileWarning}
      title="Rejected rows"
      {...{ description, aside }}
    >
      {props.rejections.length > 0 ? (
        <RejectionsTable rejections={props.rejections} />
      ) : null}
    </PanelSection>
  );
}

type SummaryProps = ViewProps & { formId: string };

function DownloadMessageAlert({
  message,
}: Readonly<{ message: DownloadMessage | null }>) {
  if (!message) return null;
  const error = message.kind === "error";
  const Icon = error ? CircleX : Info;
  return (
    <Alert variant={error ? "destructive" : "info"}>
      <Icon />
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}

/**
 * Every rejected row can be listed from an API that started the import with its options
 * (endatix#1419); an older one has no rejections read.
 */
const canListRejections = (view: AudienceImportView) =>
  view.written.rejectedCount > 0 && view.emptyCells !== undefined;

/** The rows to fix, every one of them downloadable with its line, reason and cells (E4). */
function CompletedRejections({ view, formId }: Readonly<SummaryProps>) {
  const { pending, message, download } = useRejectedRowsDownload(formId, view);
  const csv = { kind: "csv" as const, onSelect: () => void download() };
  const aside = canListRejections(view) ? (
    <DownloadMenu formats={[csv]} pending={pending} />
  ) : undefined;
  return (
    <>
      <RejectedRows
        rejections={view.rejections}
        rejectedCount={view.written.rejectedCount}
        aside={aside}
      />
      <DownloadMessageAlert message={message} />
    </>
  );
}

/** The outcome step: what happened, then the rows to fix. Shown in place, not as a toast. */
export function ImportResultSummary(props: Readonly<SummaryProps>) {
  const { view } = props;
  if (view.status !== AudienceImportStatus.Completed)
    return <EndedAlert view={view} />;
  return (
    <>
      <CompletedAlert view={view} />
      <CompletedRejections {...props} />
    </>
  );
}
