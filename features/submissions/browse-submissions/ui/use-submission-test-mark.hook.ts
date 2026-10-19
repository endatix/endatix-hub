"use client";

import { toast } from "@/components/ui/toast";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setSubmissionTestAction } from "../submission-test-flag.action";
import {
  testMarkMenuItem,
  testMarkOutcome,
  type TestMarkMenuItem,
  type TestMarkOutcome,
} from "../submission-test-flag";
import { useSubmissionTestAccess } from "./submission-test-access-context";

export type SubmissionTestMarkItem = TestMarkMenuItem & {
  isPending: boolean;
  mark: () => void;
};

/**
 * The row's Mark as test / Mark as real item, or null without `forms.test`.
 * A refused Mark as real links to the real submission that blocks it.
 */
export function useSubmissionTestMark(
  row: SubmissionGridRow,
): SubmissionTestMarkItem | null {
  const item = testMarkMenuItem(row, useSubmissionTestAccess());
  const { isPending, run } = useTestMarkRunner(row);
  return item ? { ...item, isPending, mark: () => run(item.isTest) } : null;
}

/** Marks the row, says how it went, and reads the rows again on success. */
function useTestMarkRunner({ formId, id }: SubmissionGridRow) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const openSubmission = (existingId: string) =>
    router.push(`/forms/${formId}/submissions/${existingId}`);
  const run = (isTest: boolean) =>
    startTransition(async () => {
      const result = await setSubmissionTestAction(formId, id, isTest);
      const outcome = testMarkOutcome(isTest, result);
      showTestMarkOutcome(outcome, openSubmission);
      if (outcome.refresh) router.refresh();
    });
  return { isPending, run };
}

function showTestMarkOutcome(
  outcome: TestMarkOutcome,
  openSubmission: (id: string) => void,
) {
  const existing = outcome.existingSubmissionId;
  toast[outcome.variant]({
    title: outcome.message,
    description: outcome.hint,
    action: existing
      ? { label: "Open submission", onClick: () => openSubmission(existing) }
      : undefined,
  });
}
