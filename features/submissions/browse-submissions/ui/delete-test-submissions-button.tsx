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
import { useRef, useState, useTransition } from "react";
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

/** Counts on open; null while counting or when the count cannot be read. */
function useTestSubmissionCount(formId: string) {
  const [count, setCount] = useState<number | null>(null);
  const [isCounting, startCounting] = useTransition();
  const latest = useRef(0);
  const recount = () => {
    const request = ++latest.current; // a reopen supersedes an earlier count
    setCount(null);
    startCounting(async () => {
      const result = await countTestSubmissionsAction(formId);
      if (request !== latest.current) return;
      setCount(Result.isSuccess(result) ? result.value : null);
    });
  };
  return { count, isCounting, recount };
}

function useDeleteTestSubmissions(formId: string) {
  const [open, setOpen] = useState(false);
  const { count, isCounting, recount } = useTestSubmissionCount(formId);
  const deletion = useConfirmDelete(formId, () => setOpen(false));

  const onOpenChange = (next: boolean) => {
    if (deletion.isDeleting) return; // a refusal must stay on screen
    setOpen(next);
    deletion.clearError();
    if (next) recount();
  };

  return { open, onOpenChange, count, isCounting, ...deletion };
}

/** A refusal stays in the dialog; a success closes it and reads the rows again. */
function useConfirmDelete(formId: string, close: () => void) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const confirm = () =>
    startDeleting(async () => {
      const result = await deleteTestSubmissionsAction(formId);
      const outcome = deleteTestsOutcome(result);
      if (outcome.variant === "error") return setError(outcome.message);
      toast.success(outcome.message);
      close();
      router.refresh();
    });
  return { error, clearError: () => setError(null), isDeleting, confirm };
}

const DELETE_TESTS_DESCRIPTION =
  "Test submissions in every status are removed from the grid, form counts, and exports. This cannot be undone from Hub.";

function DeleteTestSubmissionsContent(props: Readonly<DeleteTestSubmissions>) {
  const copy = deleteTestsConfirmCopy(props.count);
  const title = props.isCounting ? "Counting test submissions…" : copy.title;
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>
          {props.isCounting ? null : copy.note} {DELETE_TESTS_DESCRIPTION}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {props.error && (
        <Alert variant="destructive">
          <AlertDescription>{props.error}</AlertDescription>
        </Alert>
      )}
      <DeleteTestSubmissionsFooter {...props} canDelete={copy.canDelete} />
    </AlertDialogContent>
  );
}

type FooterProps = DeleteTestSubmissions & { canDelete: boolean };

function DeleteTestSubmissionsFooter(props: Readonly<FooterProps>) {
  const { isDeleting, confirm } = props;
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    confirm();
  };
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        disabled={props.isCounting || isDeleting || !props.canDelete}
        onClick={onClick}
        className="bg-destructive hover:bg-destructive/90"
      >
        {isDeleting && <Spinner className="mr-2 h-4 w-4" />}
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  );
}
