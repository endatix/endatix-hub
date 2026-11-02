"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formRoutes } from "@/lib/routes/form-routes";

const SUBMISSION_LINK =
  "inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type SubmissionLinkProps = {
  formId: string;
  submissionId: string;
  /** Read after the visible text, for a screen reader. */
  srLabel: string;
  children: ReactNode;
};

/** A muted link to Submission Details; the arrow marks it as a link. */
export function SubmissionLink(props: Readonly<SubmissionLinkProps>) {
  const { formId, submissionId } = props;
  return (
    <Link
      href={formRoutes.submission(formId, submissionId)}
      className={SUBMISSION_LINK}
    >
      {props.children}
      <ArrowUpRight aria-hidden="true" className="size-4" />
      <span className="sr-only">{props.srLabel}</span>
    </Link>
  );
}
