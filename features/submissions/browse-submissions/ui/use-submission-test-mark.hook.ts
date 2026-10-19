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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const item = testMarkMenuItem(row, useSubmissionTestAccess());
  if (!item) return null;

  const mark = () =>
    startTransition(async () => {
      const result = await setSubmissionTestAction(
        row.formId,
        row.id,
        item.isTest,
      );
      const outcome = testMarkOutcome(item.isTest, result);
      const existing = outcome.existingSubmissionId;
      const openExisting = () =>
        router.push(`/forms/${row.formId}/submissions/${existing}`);
      toast[outcome.variant]({
        title: outcome.message,
        action: existing
          ? { label: "Open submission", onClick: openExisting }
          : undefined,
      });
      if (outcome.refresh) router.refresh();
    });

  return { ...item, isPending, mark };
}
