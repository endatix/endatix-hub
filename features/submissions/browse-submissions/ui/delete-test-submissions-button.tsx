"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  countTestSubmissionsAction,
  deleteTestSubmissionsAction,
} from "../submission-test-flag.action";
import {
  deleteTestsConfirmCopy,
  deleteTestsOutcome,
} from "../submission-test-flag";

type DeleteTestSubmissionsButtonProps = {
  formId: string;
  disabled: boolean;
};

/** Deletes every test submission of the form after a confirm that names the count. */
export function DeleteTestSubmissionsButton({
  formId,
  disabled,
}: Readonly<DeleteTestSubmissionsButtonProps>) {
  const dialog = useDeleteTestSubmissions(formId);
  return (
    <AlertDialog open={dialog.open} onOpenChange={dialog.onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FlaskConical />
          <span className="sr-only sm:not-sr-only">
            Delete test submissions
          </span>
        </Button>
      </AlertDialogTrigger>
      <DeleteTestSubmissionsContent {...dialog} />
    </AlertDialog>
  );
}

type DeleteTestSubmissions = ReturnType<typeof useDeleteTestSubmissions>;

function useDeleteTestSubmissions(formId: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCounting, startCounting] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setError(null);
    setCount(null);
    if (!next) return;
    startCounting(async () => {
      const result = await countTestSubmissionsAction(formId);
      setCount(Result.isSuccess(result) ? result.value : null);
    });
  };

  const confirm = () =>
    startDeleting(async () => {
      const outcome = deleteTestsOutcome(
        await deleteTestSubmissionsAction(formId),
      );
      if (outcome.variant === "error") {
        setError(outcome.message);
        return;
      }
      toast.success(outcome.message);
      setOpen(false);
      router.refresh();
    });

  return { open, onOpenChange, count, error, isCounting, isDeleting, confirm };
}

function DeleteTestSubmissionsContent({
  count,
  error,
  isCounting,
  isDeleting,
  confirm,
}: Readonly<DeleteTestSubmissions>) {
  const copy = deleteTestsConfirmCopy(count);
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {isCounting ? "Counting test submissions…" : copy.title}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Test submissions in every status are removed from the grid, form
          counts, and exports. This cannot be undone from Hub.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={isCounting || isDeleting || !copy.canDelete}
          onClick={(event) => {
            event.preventDefault();
            confirm();
          }}
          className="bg-destructive hover:bg-destructive/90"
        >
          {isDeleting && <Spinner className="mr-2 h-4 w-4" />}
          {isDeleting ? "Deleting..." : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
