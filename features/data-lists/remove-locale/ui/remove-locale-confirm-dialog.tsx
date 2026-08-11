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
import { useTransition } from "react";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { removeLocaleAction } from "../remove-locale.action";

export type RemoveLocaleConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataListId: string;
  locale: string | null;
  onRemoved: (details: DataListDetails) => void;
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
}: Readonly<RemoveLocaleConfirmDialogProps>) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = (): void => {
    if (locale === null) {
      return;
    }

    const localeToRemove = locale;
    onOpenChange(false);

    startTransition(async () => {
      const result = await removeLocaleAction(dataListId, localeToRemove);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onRemoved(result.value);
      toast.success(`Removed locale ${localeToRemove}`);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove locale?</AlertDialogTitle>
          {locale ? (
            <p className="text-base font-medium text-foreground">
              {formatLocaleLabel(locale)}
            </p>
          ) : null}
          <AlertDialogDescription>
            This removes the locale from the catalog and deletes its labels from
            every item in this list. This cannot be undone from Hub without
            re-importing translations.
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
