import { HubPageLoadError } from "@/components/error-handling/error-page";
import { getSession } from "@/features/auth";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { loadSubmissionGridRows } from "../browse-submissions.server";
import { describeRowsBanner } from "../grid-readiness";
import type { SubmissionGridRowsLoad } from "../resolve-submission-grid-load";
import type { AnswerColumn } from "../submission-grid-columns";
import type { SubmissionGridUrlState } from "../submission-grid-url";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridTable } from "./submission-grid-table";

type SubmissionGridRowsSectionProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  submitterLabel: string;
  /** May export or edit, so the banner offers Prepare and Include in-progress. */
  canPrepare: boolean;
};

/**
 * One page of rows with the visible columns' answers. Runs inside the keyed
 * frame, and keeps the out-of-range redirect on the server.
 */
export async function SubmissionGridRowsSection(
  props: Readonly<SubmissionGridRowsSectionProps>,
) {
  const outcome = await loadSubmissionGridRows({
    formId: props.formId,
    urlState: props.urlState,
    columnKeys: props.answerColumns.map((column) => column.key),
    session: await getSession(),
  });

  return renderRows(outcome, props);
}

function renderRows(
  outcome: SubmissionGridRowsLoad,
  props: SubmissionGridRowsSectionProps,
) {
  switch (outcome.kind) {
    case "redirect":
      return redirect(outcome.href as Route);
    case "error":
      return <HubPageLoadError result={outcome.result} />;
    case "ready":
      return <ReadyRows outcome={outcome} {...props} />;
  }
}

type ReadyRowsProps = SubmissionGridRowsSectionProps & {
  outcome: Extract<SubmissionGridRowsLoad, { kind: "ready" }>;
};

/** One page of rows, under the rows banner when the answer filters left submissions unchecked. */
function ReadyRows({ outcome, ...props }: Readonly<ReadyRowsProps>) {
  const banner = describeRowsBanner({
    coverage: outcome.page.answerFilterCoverage,
    answerFiltersNotPrepared: outcome.answerFiltersNotPrepared,
    canPrepare: props.canPrepare,
  });
  return (
    <>
      {banner && <ReadinessBanner formId={props.formId} banner={banner} />}
      <SubmissionGridTable
        page={outcome.page}
        answerColumns={props.answerColumns}
        submitterLabel={props.submitterLabel}
      />
    </>
  );
}
