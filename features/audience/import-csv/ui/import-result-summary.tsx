"use client";

import { CircleCheckBig, FileWarning, TriangleAlert } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  StaticDataTable,
  StaticDataTableRow,
  dataTableCell,
} from "@/components/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  AudienceImportRejection,
  AudienceImportResult,
} from "@/lib/endatix-api/audience/types";
import { outcomeCounts } from "../import-labels";

type ResultProps = { result: AudienceImportResult };

const REJECTION_COLUMNS = [
  { key: "row", label: "Row", className: DATA_TABLE_SHRINK_WRAP_CLASS_NAME },
  { key: "reason", label: "Reason" },
] as const;

/** A batch with rejected rows is `warning`, never `success` (DESIGN.md §5 Status vocabulary). */
function OutcomeAlert({ result }: Readonly<ResultProps>) {
  const clean = result.rejectedCount === 0;
  const Icon = clean ? CircleCheckBig : TriangleAlert;
  return (
    <Alert variant={clean ? "success" : "warning"}>
      <Icon />
      <AlertTitle>
        {clean ? "Import finished" : "Import finished with rejected rows"}
      </AlertTitle>
      <AlertDescription>
        {outcomeCounts(result)}.{" "}
        {clean
          ? "The People list shows them."
          : "Fix the rejected rows in the file and import it again: people already imported are matched, not added twice."}
      </AlertDescription>
    </Alert>
  );
}

function rejectionsDescription(result: AudienceImportResult): string {
  const shown = result.rejections.length;
  return shown < result.rejectedCount
    ? `The first ${shown} of ${result.rejectedCount.toLocaleString()}, by their row in the file.`
    : "By their row in the file.";
}

function rejectionCells(rejection: AudienceImportRejection) {
  return [
    dataTableCell("row", rejection.rowNumber, "tabular-nums"),
    dataTableCell("reason", rejection.reason, "whitespace-normal"),
  ];
}

function RejectedRows({ result }: Readonly<ResultProps>) {
  if (result.rejections.length === 0) return null;
  return (
    <PanelSection
      icon={FileWarning}
      title="Rejected rows"
      description={rejectionsDescription(result)}
    >
      <StaticDataTable columns={REJECTION_COLUMNS}>
        {result.rejections.map((rejection, index) => (
          <StaticDataTableRow
            key={rejection.rowNumber}
            index={index}
            cells={rejectionCells(rejection)}
          />
        ))}
      </StaticDataTable>
    </PanelSection>
  );
}

/** The outcome step: what happened, then the rows to fix. Shown in place, not as a toast. */
export function ImportResultSummary({ result }: Readonly<ResultProps>) {
  return (
    <>
      <OutcomeAlert result={result} />
      <RejectedRows result={result} />
    </>
  );
}
