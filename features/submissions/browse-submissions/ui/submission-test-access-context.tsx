"use client";

import { createContext, use, type ReactNode } from "react";
import {
  NO_SUBMISSION_TEST_ACCESS,
  type SubmissionTestAccess,
} from "../submission-test-flag";

const SubmissionTestAccessContext = createContext<SubmissionTestAccess>(
  NO_SUBMISSION_TEST_ACCESS,
);

/** Lets the toolbar and every row menu read the user's test permissions. */
export function SubmissionTestAccessProvider({
  access,
  children,
}: Readonly<{ access: SubmissionTestAccess; children: ReactNode }>) {
  return (
    <SubmissionTestAccessContext value={access}>
      {children}
    </SubmissionTestAccessContext>
  );
}

export function useSubmissionTestAccess(): SubmissionTestAccess {
  return use(SubmissionTestAccessContext);
}
