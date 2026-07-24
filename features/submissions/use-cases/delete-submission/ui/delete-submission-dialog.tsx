"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { useTrackEvent } from "@/features/analytics/posthog";
import { Result } from "@/lib/result";
import { AlertTriangle } from "lucide-react";
import { deleteSubmissionAction } from "../delete-submission.action";
import {
  resolveDeleteSubmissionKind,
  resolveDeleteSubmissionRisk,
  type DeleteSubmissionKind,
  type DeleteSubmissionRiskTier,
} from "../delete-submission-risk";
import { deleteSuccessToastContent } from "./delete-success-toast-content";

export type DeleteSubmissionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  submissionId: string;
  isTestSubmission?: boolean;
  submitterId?: string | null;
  submitterDisplayId?: string | null;
  currentUserId?: string | null;
  /** When true, navigate to the submissions list after a successful delete. */
  redirectToList?: boolean;
};

function dialogCopy(
  kind: DeleteSubmissionKind,
  risk: DeleteSubmissionRiskTier,
): {
  title: string;
  description: string;
} {
  if (kind === "test") {
    return {
      title: "Delete this test submission?",
      description:
        "This will remove the test submission from the grid, form counts, and exports.",
    };
  }

  if (kind === "owned") {
    return {
      title: "Delete your submission?",
      description:
        "This will remove your submission from the grid, form counts, and exports.",
    };
  }

  return {
    title: "Delete this respondent submission?",
    description:
      risk === "elevated"
        ? "This will delete a real respondent's submission. It will be removed from the grid, form counts, and exports. This cannot be undone from Hub."
        : "This will remove the submission from the grid, form counts, and exports.",
  };
}

export function DeleteSubmissionDialog({
  open,
  onOpenChange,
  formId,
  submissionId,
  isTestSubmission,
  submitterId,
  submitterDisplayId,
  currentUserId,
  redirectToList = false,
}: Readonly<DeleteSubmissionDialogProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { trackFeatureUsage } = useTrackEvent();
  const kindArgs = {
    isTestSubmission,
    submitterId,
    submitterDisplayId,
    currentUserId,
  };
  const kind = resolveDeleteSubmissionKind(kindArgs);
  const risk = resolveDeleteSubmissionRisk(kindArgs);
  const copy = dialogCopy(kind, risk);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDelete = () => {
    startTransition(async () => {
      setErrorMessage(null);
      const result = await deleteSubmissionAction(formId, submissionId);

      if (Result.isError(result)) {
        setErrorMessage(result.message);
        return;
      }

      trackFeatureUsage("submissions", "delete", {
        form_id: formId,
        submission_id: submissionId,
        is_test: Boolean(isTestSubmission),
        kind,
        risk,
      });

      toast.success(deleteSuccessToastContent(kind));
      handleOpenChange(false);

      if (redirectToList) {
        router.push(`/forms/${formId}/submissions`);
        return;
      }

      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {risk === "elevated" ? (
              <span className="flex items-start gap-2 font-medium text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{copy.description}</span>
              </span>
            ) : (
              <span className="block text-sm">{copy.description}</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
