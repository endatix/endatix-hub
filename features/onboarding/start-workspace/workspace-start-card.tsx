"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { ErrorType, Kind, Result, type Error as ResultError } from "@/lib/result/result";
import { getFormDesignHref } from "@/features/forms/form-workspace";
import { startBlank } from "./start-blank.action";
import type { WorkspaceChoice } from "./workspace-choice";

interface Props {
  choice: WorkspaceChoice;
  scope: string;
}

export function WorkspaceStartCard({ choice, scope }: Readonly<Props>) {
  return (
    <section
      aria-label="Workspace setup"
      className="mb-6 grid gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:grid-cols-[10rem_1fr] sm:p-6"
    >
      <SetupSteps stage={choice.kind} />
      {choice.kind === "offer" ? (
        <BlankOffer scope={scope} />
      ) : (
        <CompletedChoice formId={choice.formId} />
      )}
    </section>
  );
}

function SetupSteps({ stage }: Readonly<{ stage: WorkspaceChoice["kind"] }>) {
  return (
    <div className="border-b pb-3 sm:border-e sm:border-b-0 sm:pe-4">
      <p className="mb-2 text-sm font-semibold text-primary">Workspace setup</p>
      <ol className="flex list-inside list-decimal gap-4 text-sm text-muted-foreground sm:flex-col sm:gap-1">
        <li aria-current={stage === "offer" ? "step" : undefined}>Choose a survey</li>
        <li aria-current={stage === "complete" ? "step" : undefined}>Open and edit</li>
      </ol>
    </div>
  );
}

function CompletedChoice({ formId }: Readonly<{ formId: string | null }>) {
  return (
    <div className="space-y-2" role="status">
      <h2 className="text-xl font-semibold">
        {formId ? "Your survey is ready" : "Workspace setup is complete"}
      </h2>
      {formId ? (
        <Button asChild>
          <Link href={getFormDesignHref(formId)}>Open my survey</Link>
        </Button>
      ) : (
        <p className="text-muted-foreground">
          Your first survey was deleted. You can create another from Forms.
        </p>
      )}
    </div>
  );
}

function useBlankChoice(scope: string) {
  const [failure, setFailure] = useState<ResultError>();
  const [pending, startTransition] = useTransition();
  const chooseBlank = () =>
    startTransition(async () => {
      setFailure(undefined);
      try {
        const result = await startBlank(scope);
        if (Result.isError(result)) setFailure(result);
      } catch {
        setFailure({
          kind: Kind.Error,
          errorType: ErrorType.Error,
          message: "Could not confirm your draft. Try Start blank again to resume.",
        });
      }
    });
  return { failure, pending, chooseBlank };
}

function BlankOffer({ scope }: Readonly<{ scope: string }>) {
  const { failure, pending, chooseBlank } = useBlankChoice(scope);
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Start your first survey</h2>
      <p className="text-muted-foreground">
        Begin with one untitled question. Edit it and preview the survey whenever you’re ready.
      </p>
      <blockquote className="rounded-lg border-s-2 border-primary bg-muted p-3">
        <span className="block text-xs text-muted-foreground">First question</span>
        Untitled question
      </blockquote>
      <Button disabled={pending} onClick={chooseBlank}>
        {pending ? "Starting…" : "Start blank"}
      </Button>
      {failure && <ChoiceFailure failure={failure} />}
    </div>
  );
}

function ChoiceFailure({ failure }: Readonly<{ failure: ResultError }>) {
  if (failure.requiredAction) return <StandingRefusal refusal={failure.requiredAction} />;
  return <p role="alert">{failure.message}</p>;
}
