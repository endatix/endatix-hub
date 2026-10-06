"use client";

import type { MouseEvent, ReactNode } from "react";
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
import { Spinner } from "@/components/loaders/spinner";
import type { Result } from "@/lib/result";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { PanelFormError } from "@/components/common/panel-form";

export type ConfirmDeleteCopy = {
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  successMessage: string;
};

type ConfirmDeleteDialogProps = ConfirmDeleteCopy & {
  open: boolean;
  /** What else goes with it, and what stays. */
  children: ReactNode;
  /** Runs the delete; only called while `open`. */
  action: () => Promise<Result<unknown>>;
  onClose: () => void;
};

/** Confirm runs the delete; closing is refused while it runs and clears a shown failure. */
function useConfirmDelete(props: Readonly<ConfirmDeleteDialogProps>) {
  const { run, clearError, status } = useAudienceMutation();
  const { action, successMessage, onClose } = props;
  const confirm = (event: MouseEvent) => {
    event.preventDefault();
    run({ action, successMessage, onSuccess: onClose });
  };
  const openChange = (open: boolean) => {
    if (open || status.pending) return;
    clearError();
    onClose();
  };
  return { ...status, confirm, openChange };
}

type ConfirmButtonProps = {
  pending: boolean;
  label: string;
  pendingLabel: string;
  onClick: (event: MouseEvent) => void;
};

function ConfirmButton({
  pending,
  label,
  pendingLabel,
  onClick,
}: Readonly<ConfirmButtonProps>) {
  return (
    <AlertDialogAction
      variant="destructive"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {pending ? pendingLabel : label}
    </AlertDialogAction>
  );
}

function ConfirmHeader({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <AlertDialogHeader>
      <AlertDialogTitle className="break-all">{title}</AlertDialogTitle>
      <AlertDialogDescription>{children}</AlertDialogDescription>
    </AlertDialogHeader>
  );
}

type ConfirmFooterProps = ConfirmButtonProps;

function ConfirmFooter(props: Readonly<ConfirmFooterProps>) {
  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={props.pending}>Cancel</AlertDialogCancel>
      <ConfirmButton {...props} />
    </AlertDialogFooter>
  );
}

const ERROR_TITLE = "Nothing was deleted";

/**
 * A destructive confirmation that stays open while it runs and shows a failure in place,
 * instead of closing on click like a plain `AlertDialogAction`.
 */
export function ConfirmDeleteDialog(props: Readonly<ConfirmDeleteDialogProps>) {
  const { pending, error, confirm, openChange } = useConfirmDelete(props);
  const { confirmLabel: label, pendingLabel } = props;
  return (
    <AlertDialog open={props.open} onOpenChange={openChange}>
      <AlertDialogContent>
        <ConfirmHeader title={props.title}>{props.children}</ConfirmHeader>
        <PanelFormError title={ERROR_TITLE} message={error} />
        <ConfirmFooter
          {...{ pending, label, pendingLabel }}
          onClick={confirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
