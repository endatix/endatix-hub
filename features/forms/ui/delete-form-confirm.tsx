"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { deleteFormAction } from "@/features/forms/application/actions/delete-form.action";
import { Result } from "@/lib/result";
import type { Form } from "@/types";

type FormRecord = Pick<Form, "id" | "name" | "submissionsCount">;

type DeleteFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  submissionsCount: number;
  onDelete: () => void;
};

function DeleteFormDialog({
  isOpen,
  onOpenChange,
  formName,
  submissionsCount,
  onDelete,
}: Readonly<DeleteFormDialogProps>) {
  const [formNameInput, setFormNameInput] = useState("");
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setFormNameInput("");
  };
  const handleDeleteClick = (event: MouseEvent) => {
    event.preventDefault();
    if (formNameInput !== formName) {
      toast.error("Form name doesn't match");
      return;
    }
    onDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete form <strong>{formName}</strong>?
          </AlertDialogTitle>
          <AlertDialogDescription className="mb-1 space-y-4">
            <span className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              This action will permanently delete the form, all its definitions
              and submissions, and cannot be undone.
            </span>
            <span className="block text-sm">
              <strong>{formName}</strong> has{" "}
              <strong>{submissionsCount}</strong> submissions.
            </span>
            <span className="block text-sm">
              To confirm, type the name of the form below:
            </span>
          </AlertDialogDescription>
          <Input
            type="text"
            placeholder={`Type "${formName}"`}
            value={formNameInput}
            onChange={(event) => setFormNameInput(event.target.value)}
            className="mt-1 w-full"
          />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteClick}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Form
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useDeleteForm(form: FormRecord, onDone: () => void) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return () => {
    startTransition(async () => {
      const result = await deleteFormAction(form.id);
      if (Result.isError(result)) {
        toast.error({
          title: "Failed to delete form",
          description: result.message,
        });
        return;
      }
      toast.success({
        title: (
          <>
            <strong>{form.name}</strong> deleted successfully
          </>
        ),
      });
      onDone();
      router.push("/forms");
      router.refresh();
    });
  };
}

type ConfirmProps = {
  form: FormRecord;
  open: boolean;
  onClose: () => void;
};

/** Confirm-by-name delete. Used by the form header menu and the form card. */
export function DeleteFormConfirm({
  form,
  open,
  onClose,
}: Readonly<ConfirmProps>) {
  const handleDelete = useDeleteForm(form, onClose);
  return (
    <DeleteFormDialog
      isOpen={open}
      onOpenChange={(next) => !next && onClose()}
      formName={form.name}
      submissionsCount={form.submissionsCount ?? 0}
      onDelete={handleDelete}
    />
  );
}
