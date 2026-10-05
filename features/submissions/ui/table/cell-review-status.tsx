"use client";

import type { Submission } from "@/lib/endatix-api";
import {
  describeCollectionStatus,
  isReviewApplicable,
} from "../describe-collection-status";
import { CellStatusDropdown } from "./cell-status-dropdown";

type CellReviewStatusProps = {
  // The wire sends review codes (new, read, …) in `status`, wider than `Submission["status"]`.
  submission: Pick<
    Submission,
    "id" | "formId" | "isComplete" | "collectionStatus"
  > & {
    status: string;
  };
};

/** The review control, or a dash while the submission is still being collected. */
export function CellReviewStatus({
  submission,
}: Readonly<CellReviewStatusProps>) {
  const { id, formId, status, isComplete, collectionStatus } = submission;
  const collection = describeCollectionStatus(collectionStatus, isComplete);
  if (!isReviewApplicable(collection, status)) {
    return <NotReviewable />;
  }

  return <CellStatusDropdown code={status} submissionId={id} formId={formId} />;
}

function NotReviewable() {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not reviewable until complete</span>
    </span>
  );
}
