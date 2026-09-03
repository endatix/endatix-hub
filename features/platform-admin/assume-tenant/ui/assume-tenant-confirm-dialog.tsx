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
import { Result } from "@/lib/result";
import { assumeTenantAction } from "../assume-tenant.action";
import { useTransition } from "react";

export type AssumeTenantTarget = {
  id: string;
  name: string;
};

interface AssumeTenantConfirmDialogProps {
  tenant: AssumeTenantTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function AssumeTenantConfirmDialog({
  tenant,
  onOpenChange,
}: Readonly<AssumeTenantConfirmDialogProps>) {
  const [isPending, startTransition] = useTransition();
  const open = tenant !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenChange(false);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assume tenant for support?</AlertDialogTitle>
          <AlertDialogDescription>
            {tenant ? (
              <>
                You will view{" "}
                <span className="font-medium text-foreground">
                  {tenant.name}
                </span>{" "}
                as a platform administrator. You are not joining the tenant as a
                member. Use this only for support, then exit when you are done.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !tenant}
            onClick={(event) => {
              event.preventDefault();
              if (!tenant) {
                return;
              }

              startTransition(async () => {
                const result = await assumeTenantAction(tenant.id);
                if (result && Result.isError(result)) {
                  toast.error(result.message || "Failed to enter tenant");
                }
              });
            }}
          >
            {isPending ? "Assuming…" : "Assume tenant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
