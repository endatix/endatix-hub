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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { deleteFolderAction } from "@/features/folders/server";
import { Result } from "@/lib/result";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

type FolderDeleteButtonProps = {
  folderId: string;
  folderName: string;
  immutable: boolean;
  /** Where to navigate after delete. Omit when already on that route (e.g. folder list). */
  afterDeleteHref?: Route;
  /** When true, only refresh the router (no redirect). */
  skipNavigation?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  /** Label for trigger when not using icon-only */
  triggerLabel?: string;
};

export function FolderDeleteButton({
  folderId,
  folderName,
  immutable,
  afterDeleteHref = "/folders",
  skipNavigation = false,
  variant = "destructive",
  triggerLabel,
}: Readonly<FolderDeleteButtonProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await deleteFolderAction(folderId);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success("Folder deleted");
      setOpen(false);
      if (!skipNavigation) {
        router.push(afterDeleteHref);
      }
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={triggerLabel ? "default" : "icon"}
          disabled={immutable || pending}
          aria-label={`Delete folder ${folderName}`}
        >
          <Trash2
            className="size-4"
            data-icon={triggerLabel ? "inline-start" : undefined}
          />
          {triggerLabel ?? null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{folderName}</span>{" "}
            will be removed. Forms and templates in this folder will no longer
            be assigned to a folder (they are not deleted). Child folders become
            top-level.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
