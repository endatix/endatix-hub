"use client";

import { Building2, MessageSquareText, TriangleAlert } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { PanelSection } from "@/components/common/panel-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { Textarea } from "@/components/ui/textarea";
import { formatPreciseDateTime } from "@/lib/date-utils";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { ErrorType, Result, type ResultType } from "@/lib/result";
import {
  approveSignupRequestAction,
  rejectSignupRequestAction,
  retrySignupProvisioningAction,
} from "../review-signup-request.actions";
import {
  REJECTION_REASON_MAX_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from "../signup-request-limits";
import {
  describeSignupRequest,
  suggestWorkspaceName,
} from "../signup-request-state";
import type { SignupReviewers } from "../types";
import { SignupRequestDetails } from "./signup-request-details";

type ReviewStep = "review" | "approve" | "reject";
type ReviewOutcome = "approved" | "rejected" | "retried";

interface SignupRequestReviewPanelProps {
  /** Kept after close so the panel does not empty while it animates out. */
  request: SignupRequestListItem | null;
  open: boolean;
  reviewers: SignupReviewers;
  onOpenChange: (open: boolean) => void;
}

/**
 * Review → decide → outcome, in one panel. The reviewer always sees the record
 * before a decision control, and the result of a decision replaces the form.
 */
export function SignupRequestReviewPanel({
  request,
  open,
  reviewers,
  onOpenChange,
}: Readonly<SignupRequestReviewPanelProps>) {
  return (
    <ResponsivePanel
      desktopType="complex"
      open={open}
      onOpenChange={onOpenChange}
    >
      {request && (
        <ReviewContent
          key={request.id}
          request={request}
          reviewers={reviewers}
        />
      )}
    </ResponsivePanel>
  );
}

function ReviewContent({
  request,
  reviewers,
}: Readonly<{ request: SignupRequestListItem; reviewers: SignupReviewers }>) {
  const router = useRouter();
  const ids = useId();
  const [current, setCurrent] = useState(request);
  const [step, setStep] = useState<ReviewStep>("review");
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [workspaceName, setWorkspaceName] = useState(() =>
    suggestWorkspaceName(request),
  );
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A refreshed list row is newer than what the panel opened with.
  useEffect(() => {
    setCurrent((previous) =>
      (request.modifiedAt ?? "") >= (previous.modifiedAt ?? "")
        ? request
        : previous,
    );
  }, [request]);

  const state = describeSignupRequest(current);

  const goTo = (next: ReviewStep) => {
    setStep(next);
    setFieldError(null);
    setFailure(null);
  };

  const run = (
    action: () => Promise<ResultType<SignupRequestListItem>>,
    completed: ReviewOutcome,
  ) => {
    setFieldError(null);
    setFailure(null);
    startTransition(async () => {
      let result: ResultType<SignupRequestListItem>;
      try {
        result = await action();
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }
        setFailure("Something went wrong. Try again.");
        return;
      }
      if (Result.isError(result)) {
        // A rejected value belongs under its field; anything else is about the request.
        if (result.errorType === ErrorType.ValidationError) {
          setFieldError(result.message);
        } else {
          setFailure(result.message);
        }
        return;
      }

      setCurrent(result.value);
      setOutcome(completed);
      setStep("review");
    });
  };

  const approve = () =>
    run(
      () => approveSignupRequestAction(current.id, workspaceName),
      "approved",
    );
  const reject = () =>
    run(() => rejectSignupRequestAction(current.id, reason), "rejected");
  const retry = () =>
    run(() => retrySignupProvisioningAction(current.id), "retried");

  if (step === "approve") {
    return (
      <ApproveStep
        ids={ids}
        email={current.email}
        workspaceName={workspaceName}
        fieldError={fieldError}
        failure={failure}
        isPending={isPending}
        onNameChange={(value) => {
          setWorkspaceName(value);
          setFieldError(null);
        }}
        onBack={() => goTo("review")}
        onApprove={approve}
      />
    );
  }

  if (step === "reject") {
    return (
      <RejectStep
        ids={ids}
        email={current.email}
        reason={reason}
        fieldError={fieldError}
        failure={failure}
        isPending={isPending}
        onReasonChange={(value) => {
          setReason(value);
          setFieldError(null);
        }}
        onBack={() => goTo("review")}
        onReject={reject}
      />
    );
  }

  return (
    <>
      <ResponsivePanelHeader>
        <ResponsivePanelTitle className="break-all">
          {current.email}
        </ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Workspace request submitted {formatPreciseDateTime(current.createdAt)}
          .
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>
        {failure ? (
          <FailureAlert message={failure} />
        ) : (
          <ReviewStatusAlert request={current} outcome={outcome} />
        )}
        <SignupRequestDetails request={current} reviewers={reviewers} />
      </ResponsivePanelBody>
      {state.nextStep === "decide" && (
        <ResponsivePanelFooter>
          <Button variant="outline" onClick={() => goTo("reject")}>
            Reject…
          </Button>
          <Button onClick={() => goTo("approve")}>Approve…</Button>
        </ResponsivePanelFooter>
      )}
      {state.nextStep === "retry" && (
        <ResponsivePanelFooter>
          <Button onClick={retry} disabled={isPending}>
            {isPending ? "Retrying…" : "Retry workspace setup"}
          </Button>
        </ResponsivePanelFooter>
      )}
      {current.status === "approved" &&
        current.provisioningStatus === "pending" && (
          <ResponsivePanelFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(() => router.refresh())}
            >
              {isPending ? "Checking…" : "Check again"}
            </Button>
          </ResponsivePanelFooter>
        )}
    </>
  );
}

function ApproveStep({
  ids,
  email,
  workspaceName,
  fieldError,
  failure,
  isPending,
  onNameChange,
  onBack,
  onApprove,
}: Readonly<{
  ids: string;
  email: string;
  workspaceName: string;
  fieldError: string | null;
  failure: string | null;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onBack: () => void;
  onApprove: () => void;
}>) {
  const nameId = `${ids}-workspace-name`;
  return (
    <>
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Approve request</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Create a workspace for {email}.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>
        <FailureAlert message={failure} />
        <PanelSection
          icon={Building2}
          title="Workspace"
          description="Suggested from the company name. You can rename it later in Tenants."
        >
          <div className="grid gap-2">
            <Label htmlFor={nameId}>Workspace name</Label>
            <Input
              id={nameId}
              value={workspaceName}
              maxLength={WORKSPACE_NAME_MAX_LENGTH}
              autoComplete="off"
              autoFocus
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${nameId}-error` : undefined}
              onChange={(event) => onNameChange(event.target.value)}
            />
            {fieldError && (
              <p id={`${nameId}-error`} className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
        </PanelSection>
        <Alert variant="info">
          <AlertTitle>What approving does</AlertTitle>
          <AlertDescription>
            Creates the workspace and invites {email} as its Admin. The decision
            is recorded under your name and cannot be undone.
          </AlertDescription>
        </Alert>
      </ResponsivePanelBody>
      <ResponsivePanelFooter>
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button
          onClick={onApprove}
          disabled={isPending || !workspaceName.trim()}
        >
          {isPending ? "Approving…" : "Approve and create workspace"}
        </Button>
      </ResponsivePanelFooter>
    </>
  );
}

function RejectStep({
  ids,
  email,
  reason,
  fieldError,
  failure,
  isPending,
  onReasonChange,
  onBack,
  onReject,
}: Readonly<{
  ids: string;
  email: string;
  reason: string;
  fieldError: string | null;
  failure: string | null;
  isPending: boolean;
  onReasonChange: (value: string) => void;
  onBack: () => void;
  onReject: () => void;
}>) {
  const reasonId = `${ids}-reason`;
  const describedBy = fieldError
    ? `${reasonId}-hint ${reasonId}-error`
    : `${reasonId}-hint`;
  return (
    <>
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Reject request</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Close the request from {email} without a workspace.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>
        <FailureAlert message={failure} />
        <PanelSection
          icon={MessageSquareText}
          title="Reason"
          description="Kept with the decision for other admins. The requester is not notified."
        >
          <div className="grid gap-2">
            <Label htmlFor={reasonId}>Why is this request rejected?</Label>
            <Textarea
              id={reasonId}
              value={reason}
              rows={5}
              maxLength={REJECTION_REASON_MAX_LENGTH}
              autoFocus
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={describedBy}
              onChange={(event) => onReasonChange(event.target.value)}
            />
            <p
              id={`${reasonId}-hint`}
              className="text-xs text-muted-foreground tabular-nums"
            >
              {reason.length} / {REJECTION_REASON_MAX_LENGTH}
            </p>
            {fieldError && (
              <p id={`${reasonId}-error`} className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
        </PanelSection>
      </ResponsivePanelBody>
      <ResponsivePanelFooter>
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button
          variant="destructive"
          onClick={onReject}
          disabled={isPending || !reason.trim()}
        >
          {isPending ? "Rejecting…" : "Reject request"}
        </Button>
      </ResponsivePanelFooter>
    </>
  );
}

/**
 * At most one strip: the result of what the reviewer just did, otherwise a
 * standing problem with the record. Tones follow DESIGN.md §6.
 */
function FailureAlert({ message }: Readonly<{ message: string | null }>) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>The request was not updated</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ReviewStatusAlert({
  request,
  outcome,
}: Readonly<{
  request: SignupRequestListItem;
  outcome: ReviewOutcome | null;
}>) {
  if (outcome === "rejected") {
    return (
      <Alert variant="success" role="status">
        <AlertTitle>Request rejected</AlertTitle>
        <AlertDescription>
          The reason is saved with the decision. The requester was not notified.
        </AlertDescription>
      </Alert>
    );
  }

  const workspace = request.tenantName ?? "The workspace";

  if (request.status !== "approved") {
    return null;
  }

  return approvedStatusAlert(request, outcome, workspace);
}

function approvedStatusAlert(
  request: SignupRequestListItem,
  outcome: ReviewOutcome | null,
  workspace: string,
) {
  if (request.provisioningStatus === "failed") {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>
          {outcome === "approved"
            ? "Approved, but the workspace setup failed"
            : "Workspace setup failed"}
        </AlertTitle>
        <AlertDescription>
          {request.approvedTenantId
            ? `${workspace} exists and will be reused. Retry to finish inviting ${request.email}.`
            : `Retry to create ${workspace} and invite ${request.email}.`}{" "}
          The cause is in the API logs.
        </AlertDescription>
      </Alert>
    );
  }

  if (request.provisioningStatus === "pending") {
    return (
      <Alert variant="info" role="status">
        <AlertTitle>Setting up the workspace</AlertTitle>
        <AlertDescription>
          {outcome === "approved" ? "Approved. " : ""}
          {workspace} is still being created. Check again in a moment.
        </AlertDescription>
      </Alert>
    );
  }

  if (outcome === "approved" || outcome === "retried") {
    return (
      <Alert variant="success" role="status">
        <AlertTitle>Workspace ready</AlertTitle>
        <AlertDescription>
          {workspace} was created and {request.email} was invited as its Admin.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
