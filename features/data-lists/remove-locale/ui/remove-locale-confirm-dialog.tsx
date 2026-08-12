"use client";

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
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { useEffect, useTransition, type MouseEvent } from "react";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { removeLocaleAction } from "../remove-locale.action";

export type RemoveLocaleConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataListId: string;
  locale: string | null;
  onRemoved: (details: DataListDetails) => void;
  onPendingChange?: (isPending: boolean) => void;
};

/**
 * Confirms catalog locale removal (strips item labels for that culture).
 */
export function RemoveLocaleConfirmDialog({
  open,
  onOpenChange,
  dataListId,
  locale,
  onRemoved,
  onPendingChange,
}: Readonly<RemoveLocaleConfirmDialogProps>) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const handleConfirm = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    if (locale === null || isPending) {
      return;
    }

    const localeToRemove = locale;

    startTransition(async () => {
      const result = await removeLocaleAction(dataListId, localeToRemove);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onRemoved(result.value);
      toast.success(`Removed locale ${localeToRemove}`);
      onOpenChange(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove translation?</AlertDialogTitle>
          {locale ? (
            <p className="text-base font-medium text-foreground">
              {formatLocaleLabel(locale)}
            </p>
          ) : null}
          <AlertDialogDescription>
            This removes the language from the data catalog and deletes each
            label translation from every item in this list. This cannot be
            undone from Hub without re-importing translations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !locale}
            onClick={handleConfirm}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
