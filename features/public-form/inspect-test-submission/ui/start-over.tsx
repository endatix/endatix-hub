"use client";

import { restartTestSubmissionAction } from "@/features/public-form/application/actions/restart-test-submission.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./start-over.module.css";

export type TestStartOver = { formId: string; submissionId: string };

const PERSON_REMOVED =
  "This person is no longer on this form, so this test submission cannot start over.";
/** Detail from Restart when the membership is gone. Other 404s keep Start over. */
const PERSON_NOT_ON_FORM = "Person not found on this form.";
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
 * it. Only "Person not found on this form." hides the button. A missing submission or form is
 * the same 404 and can be tried again.
 */
export function useStartOver(startOver: TestStartOver) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);
  const [personRemoved, setPersonRemoved] = useState(false);
  const run = () => {
    setProblem(null);
    startTransition(async () => {
      const result = await restartOrFailure(startOver);
      if (Result.isSuccess(result)) return router.refresh();
      const removed =
        result.statusCode === 404 && result.message === PERSON_NOT_ON_FORM;
      setPersonRemoved(removed);
      setProblem(removed ? PERSON_REMOVED : result.message);
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

export function StartOver({
  startOver,
}: Readonly<{ startOver: TestStartOver }>) {
  const { pending, problem, canRun, run } = useStartOver(startOver);
  return (
    <>
      {canRun ? <StartOverButton pending={pending} run={run} /> : null}
      {problem ? <output className={styles.note}>{problem}</output> : null}
    </>
  );
}
