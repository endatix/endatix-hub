"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { Result } from "@/lib/result";
import { useEffect, useState, useTransition } from "react";
import { approveSignupRequestAction } from "../signup-requests.actions";

interface ApproveSignupRequestDialogProps {
  request: SignupRequestListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApproveSignupRequestDialog({
  request,
  open,
  onOpenChange,
}: Readonly<ApproveSignupRequestDialogProps>) {
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !request) {
      return;
    }

    setTenantName(request.companyName ?? request.email.split("@")[0] ?? "");
    setError(null);
  }, [open, request]);

  const handleApprove = () => {
    if (!request) {
      return;
    }

    startTransition(async () => {
      const result = await approveSignupRequestAction(request.id, tenantName);
      if (Result.isError(result)) {
        setError(result.message);
        return;
      }

      if (result.value.provisioningStatus === "failed") {
        toast.error(
          "Approved, but provisioning failed. Retry it from this list.",
        );
      } else if (result.value.provisioningStatus === "succeeded") {
        toast.success("Signup request approved.");
      } else {
        toast.success(
          "Signup request approved. Provisioning is still running.",
        );
      }
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve signup request</DialogTitle>
          <DialogDescription>
            Create a tenant for {request?.email}. The requester becomes a tenant
            Admin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="tenantName">Tenant name</Label>
          <Input
            id="tenantName"
            value={tenantName}
            onChange={(event) => setTenantName(event.target.value)}
            autoComplete="off"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending || !tenantName.trim()}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
