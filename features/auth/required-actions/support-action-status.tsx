"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Result, type ResultType } from "@/lib/result";
import { AuthStatus } from "../ui/auth-status";
import { SIGNOUT_PATH } from "../infrastructure/auth-constants";

interface Props {
  exitAction: () => Promise<ResultType<boolean>>;
}

export function SupportActionStatus({ exitAction }: Readonly<Props>) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const exit = () =>
    start(async () => {
      setFailed(false);
      const result = await exitAction();
      if (Result.isError(result)) setFailed(true);
    });
  return (
    <AuthStatus
      tone="warning"
      title="Support session"
      description="Return to your home tenant to review your Terms."
    >
      <Button onClick={exit} disabled={pending}>
        {pending ? "Returning…" : "Return to home tenant"}
      </Button>
      {failed && (
        <p role="alert">
          Could not return to your home tenant. Try again or sign out.
        </p>
      )}
      <Link href={SIGNOUT_PATH}>Sign out of support session</Link>
    </AuthStatus>
  );
}
