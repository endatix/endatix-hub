import { HubPageLoadError } from "@/components/error-handling/error-page";
import { getSession } from "@/features/auth";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { loadSubmissionGridRows } from "../browse-submissions.server";
import type { SubmissionGridRowsLoad } from "../resolve-submission-grid-load";
import type { AnswerColumn } from "../submission-grid-columns";
import type { SubmissionGridUrlState } from "../submission-grid-url";
import { SubmissionGridTable } from "./submission-grid-table";

type SubmissionGridRowsSectionProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  submitterLabel: string;
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
  { answerColumns, submitterLabel }: SubmissionGridRowsSectionProps,
) {
  switch (outcome.kind) {
    case "redirect":
      return redirect(outcome.href as Route);
    case "error":
      return <HubPageLoadError result={outcome.result} />;
    case "ready":
      return (
        <SubmissionGridTable
          page={outcome.page}
          answerColumns={answerColumns}
          submitterLabel={submitterLabel}
        />
      );
  }
}
