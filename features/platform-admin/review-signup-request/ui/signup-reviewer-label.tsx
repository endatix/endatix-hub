"use client";

import { TruncatedId } from "@/components/common/truncated-id";
import type { SignupReviewers } from "../types";

interface SignupReviewerLabelProps {
  userId: string | null;
  reviewers: SignupReviewers;
}

/**
 * The admin who decided. A revoked admin is no longer in the directory, so the
 * id stays visible rather than disappearing from the audit record.
 */
export function SignupReviewerLabel({
  userId,
  reviewers,
}: Readonly<SignupReviewerLabelProps>) {
  if (!userId) {
    return (
      <span className="font-normal text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not recorded</span>
      </span>
    );
  }

  const name = reviewers[userId];
  if (name) {
    return <span className="break-words">{name}</span>;
  }

  return (
    <span className="flex items-center gap-1.5 font-normal text-muted-foreground">
      Admin
      <TruncatedId id={userId} copyLabel="Copy user id" />
    </span>
  );
}
