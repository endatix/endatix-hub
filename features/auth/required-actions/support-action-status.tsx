"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Result, type ResultType } from "@/lib/result";
import { toActionFailure } from "@/lib/result/action-failure";
import { AuthStatus } from "../ui/auth-status";
import { SIGNOUT_PATH } from "../infrastructure/auth-constants";

interface Props {
  exitAction: () => Promise<ResultType<boolean>>;
}

export function SupportActionStatus({ exitAction }: Readonly<Props>) {
  return (
    <AuthStatus
      tone="warning"
      title="Support session"
      description="Return to your home tenant to review your Terms."
    >
      <ReturnHome exitAction={exitAction} />
      <Link href={SIGNOUT_PATH}>Sign out of support session</Link>
    </AuthStatus>
  );
}

function ReturnHome({ exitAction }: Readonly<Props>) {
  const { exit, pending, failed } = useReturnHome(exitAction);
  return (
    <>
      <Button onClick={exit} disabled={pending}>
        {pending ? "Returning…" : "Return to home tenant"}
      </Button>
      {failed && (
        <p role="alert">
          Could not return to your home tenant. Try again or sign out.
        </p>
      )}
    </>
  );
}

function useReturnHome(exitAction: Props["exitAction"]) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const exit = () =>
    start(async () => {
      setFailed(false);
      const result = await exitAction().catch(
        toActionFailure("Could not return to your home tenant."),
      );
      if (Result.isError(result)) setFailed(true);
    });
  return { exit, pending, failed };
}
