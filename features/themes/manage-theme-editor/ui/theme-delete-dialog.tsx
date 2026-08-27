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
import type { Route } from "next";
import { ClipboardList, ExternalLink } from "lucide-react";
import Link from "next/link";

export interface ThemeInUseForm {
  id: string;
  name: string;
}

export interface ThemeDeleteRequest {
  themeName: string;
  /** Other forms still using the theme. Non-empty blocks the delete. */
  formsInUse: ThemeInUseForm[];
  onConfirm: () => void;
}

interface ThemeDeleteDialogProps {
  request: ThemeDeleteRequest | null;
  onClose: () => void;
}

/**
 * Confirms theme deletion, or explains why it is blocked. Forms open in a new tab:
 * the author is mid-edit here and navigating away would drop unsaved changes.
 */
export function ThemeDeleteDialog({
  request,
  onClose,
}: Readonly<ThemeDeleteDialogProps>) {
  if (!request) {
    return null;
  }

  const { themeName, formsInUse } = request;
  const isBlocked = formsInUse.length > 0;

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? "Theme is still in use" : "Delete theme?"}
          </AlertDialogTitle>
          <p className="text-base font-medium text-foreground">{themeName}</p>
          <AlertDialogDescription>
            {isBlocked
              ? "Move these forms to a different theme first, then delete it."
              : "This removes the theme for good. Forms using it fall back to the Default theme."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isBlocked && (
          <div className="flex flex-col gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ClipboardList className="size-3.5" />
              Forms using this theme ({formsInUse.length})
            </p>
            <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {formsInUse.map((form) => (
                <li key={form.id}>
                  <Link
                    href={`/forms/${form.id}` as Route}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-accent"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">
                      {form.name}
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Radix closes on either action, which fires onOpenChange → onClose. */}
        <AlertDialogFooter>
          {isBlocked ? (
            <AlertDialogAction>Got it</AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={request.onConfirm}>
                Delete theme
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
