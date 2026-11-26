"use client";

import Link from "next/link";
import { Check, FilePenLine, UsersRound } from "lucide-react";
import { useState, useTransition } from "react";
import { PendingButton } from "@/components/common/pending-button";
import { Button } from "@/components/ui/button";
import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { Result, type Error as ResultError } from "@/lib/result/result";
import { getFormDesignHref } from "@/features/forms/form-workspace";
import { retryPreparation, startBlank } from "./start-blank.action";
import { PreparingStatus } from "./preparing-status";
import type { WorkspaceChoice } from "./workspace-choice";

interface Props {
  choice: WorkspaceChoice;
  scope: string;
  canRetry?: boolean;
}

export function WorkspaceStartCard(props: Readonly<Props>) {
  return (
    <div className="grid items-start gap-6 min-[861px]:grid-cols-[280px_minmax(0,1fr)] min-[861px]:gap-8">
      <SetupSteps stage={props.choice.kind} />
      <section aria-label="Workspace setup choice" className="min-w-0 rounded-[20px] border bg-card p-5 text-card-foreground sm:p-8">
        <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {props.choice.kind === "complete" ? "Setup complete" : "Workspace setup · Step 2 of 2"}
        </p>
        <ChoicePanel {...props} key={props.choice.kind} />
      </section>
    </div>
  );
}

function ChoicePanel({ choice, scope, canRetry }: Readonly<Props>) {
  if (choice.kind === "complete") return <CompletedChoice formId={choice.formId} />;
  if (choice.kind === "offer") return <BlankOffer scope={scope} />;
  return <RecoveryPanel working={choice.kind === "working"} scope={scope} canRetry={canRetry} />;
}

function SetupSteps({ stage }: Readonly<{ stage: WorkspaceChoice["kind"] }>) {
  const complete = stage === "complete";
  return (
    <aside aria-label="Workspace setup progress" className="min-[861px]:sticky min-[861px]:top-4">
      <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Workspace setup</p>
      <h2 className="text-lg font-semibold tracking-tight">Make this workspace yours</h2>
      <ol className="my-4 grid gap-1 text-sm">
        <SetupStep title="Check the Terms" detail="No further action needed." done />
        <SetupStep title="Make it yours" detail={complete ? "Your workspace is ready." : "Prepare your first survey."} done={complete} />
      </ol>
      <p className="flex gap-2 border-t pt-3 text-sm text-muted-foreground"><UsersRound aria-hidden className="mt-0.5 size-4 shrink-0" />
        {complete ? "Workspace setup is complete for teammate invitations." : "Finish workspace setup before inviting teammates."}</p>
    </aside>
  );
}

function SetupStep({ title, detail, done }: Readonly<{ title: string; detail: string; done: boolean }>) {
  return <li aria-current={done ? undefined : "step"} className="flex gap-3 rounded-xl border border-transparent px-3 py-2.5 aria-[current=step]:border-border aria-[current=step]:bg-card">
    <span className={`grid size-6 shrink-0 place-content-center rounded-full text-xs font-bold ${done ? "bg-foreground text-background" : "border-2 border-primary text-primary"}`}>
      {done ? <><Check aria-hidden className="size-4" /><span className="sr-only">Complete:</span></> : "2"}
    </span>
    <span><strong className="block font-semibold">{title}</strong><span className="text-muted-foreground">{detail}</span></span>
  </li>;
}

function CompletedChoice({ formId }: Readonly<{ formId: string | null }>) {
  return (
    <div className="space-y-2" role="status">
      <h1 className="text-3xl font-semibold tracking-tight">
        {formId ? "Your survey is ready" : "Workspace setup is complete"}
      </h1>
      {formId ? (
        <>
          <p className="mb-5 text-muted-foreground">Your draft is saved in Forms. Open it to edit your questions and preview the survey.</p>
          <Button asChild><Link href={getFormDesignHref(formId, "forms")}>Open my survey</Link></Button>
        </>
      ) : (
        <p className="text-muted-foreground">
          Your first survey was deleted. You can create another from Forms.
        </p>
      )}
    </div>
  );
}

async function confirmChoice(scope: string, action: "blank" | "retry") {
  try {
    return await (action === "blank" ? startBlank(scope) : retryPreparation(scope));
  } catch {
    return Result.error("Could not confirm your draft. Try again or refresh to check its status.");
  }
}

function useWorkspaceChoice(scope: string) {
  const [activeAction, setActiveAction] = useState<"blank" | "retry">("blank");
  const [failure, setFailure] = useState<ResultError>();
  const [pending, startTransition] = useTransition();
  const submit = (action: "blank" | "retry") => {
    setFailure(undefined);
    setActiveAction(action);
    startTransition(async () => {
      const result = await confirmChoice(scope, action);
      if (Result.isError(result)) setFailure(result);
    });
  };
  return { failure, pending, activeAction, submit };
}

function BlankOffer({ scope }: Readonly<{ scope: string }>) {
  const { failure, pending, submit } = useWorkspaceChoice(scope);
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start your first survey</h1>
      <p className="mt-2 text-muted-foreground">Begin with a blank draft. You can change every question and preview it before sharing.</p>
      <div className="mt-6 grid gap-4 rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center gap-3"><FilePenLine aria-hidden className="size-5 text-primary" /><h2 className="text-lg font-semibold">Blank survey</h2></div>
        <p className="text-sm text-muted-foreground">One editable question to get you started.</p>
        <BlankQuestionPreview />
        <Button className="justify-self-start" disabled={pending} onClick={() => submit("blank")}>
          {pending ? "Starting…" : "Start blank"}
        </Button>
      </div>
      {failure && <ChoiceFailure failure={failure} />}
    </div>
  );
}

function BlankQuestionPreview() {
  return <blockquote className="rounded-xl bg-muted px-4 py-3">
    <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">First question</span>
    Untitled question
  </blockquote>;
}

function RecoveryPanel({ scope, working, canRetry }: Readonly<{ scope: string; working: boolean; canRetry?: boolean }>) {
  const { failure, pending, activeAction, submit } = useWorkspaceChoice(scope);
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight">{working ? "Preparing your survey" : "Setup paused"}</h1>
      {!working && <p>Your survey couldn’t be prepared. Your draft is reserved, so continuing won’t create another one.</p>}
      {working && <PreparingStatus scope={scope} />}
      <p className="text-muted-foreground">Finish blank to use a survey with one untitled question instead.</p>
      <div className="flex flex-wrap gap-2 motion-reduce:[&_svg]:animate-none">
        {canRetry && <PendingButton disabled={pending} pending={pending && activeAction === "retry"}
          label="Retry preparation" pendingLabel="Retrying…" onClick={() => submit("retry")} />}
        <PendingButton variant="outline" disabled={pending} pending={pending && activeAction === "blank"}
          label="Finish blank" pendingLabel="Finishing…" onClick={() => submit("blank")} />
      </div>
      {failure && <ChoiceFailure failure={failure} />}
    </div>
  );
}

function ChoiceFailure({ failure }: Readonly<{ failure: ResultError }>) {
  if (failure.requiredAction) return <StandingRefusal refusal={failure.requiredAction} />;
  return <p role="alert">{failure.message}</p>;
}
