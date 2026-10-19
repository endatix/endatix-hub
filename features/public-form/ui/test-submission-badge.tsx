"use client";

import { restartTestSubmissionAction } from "@/features/public-form/application/actions/restart-test-submission.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./test-submission-badge.module.css";

export type TestStartOver = { formId: string; submissionId: string };

const PERSON_REMOVED =
  "This person is no longer on this form, so this test submission cannot start over.";
const REJECTED = "Start over failed. Try again.";

async function restartOrFailure({ formId, submissionId }: TestStartOver) {
  try {
    return await restartTestSubmissionAction(formId, submissionId);
  } catch {
    return Result.error<void>(REJECTED);
  }
}

/**
 * Start over: the action swaps the form cookie to a new test submission and the page reloads on
 * it. A 404 means the person was removed, so the button goes and the reason stays.
 */
function useStartOver(startOver: TestStartOver) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [personRemoved, setPersonRemoved] = useState(false);
  const run = () => {
    setProblem(null);
    startTransition(async () => {
      const result = await restartOrFailure(startOver);
      if (Result.isSuccess(result)) return router.refresh();
      setPersonRemoved(result.statusCode === 404);
      setProblem(result.statusCode === 404 ? PERSON_REMOVED : result.message);
    });
  };
  return { pending, problem, canRun: !personRemoved, run };
}

function StartOverButton({
  pending,
  run,
}: Readonly<{ pending: boolean; run: () => void }>) {
  return (
    <button
      className={styles.action}
      disabled={pending}
      onClick={run}
      type="button"
    >
      Start over
    </button>
  );
}

function StartOver({ startOver }: Readonly<{ startOver: TestStartOver }>) {
  const { pending, problem, canRun, run } = useStartOver(startOver);
  return (
    <>
      {canRun ? <StartOverButton pending={pending} run={run} /> : null}
      {problem ? (
        <span className={styles.note} role="status">
          {problem}
        </span>
      ) : null}
    </>
  );
}

const WARNING_ICON = (
  <svg
    aria-hidden="true"
    className={styles.icon}
    fill="none"
    viewBox="0 0 16 16"
  >
    <path
      d="M8 5.25V8.5M8 11h.007M7.07 2.76 1.34 12.5A1.07 1.07 0 0 0 2.27 14h11.46a1.07 1.07 0 0 0 .93-1.5L8.93 2.76a1.07 1.07 0 0 0-1.86 0Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

/**
 * Corner indicator that the respondent is submitting a test submission. Positioned like the
 * Next.js dev overlay; on a test submission opened as a person it carries Start over.
 */
export function TestSubmissionBadge({
  startOver,
}: Readonly<{ startOver?: TestStartOver }>) {
  return (
    <aside
      aria-label="Test submission"
      className={styles.anchor}
      data-testid="respondent-test-mode-badge"
    >
      <span className={styles.badge}>
        {WARNING_ICON}
        You are submitting a test submission
      </span>
      {startOver ? <StartOver startOver={startOver} /> : null}
    </aside>
  );
}
