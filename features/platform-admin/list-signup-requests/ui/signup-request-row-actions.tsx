"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { Result } from "@/lib/result";
import { useTransition } from "react";
import { retrySignupProvisioningAction } from "../signup-requests.actions";

export function SignupRequestRowActions({
  request,
  onApprove,
  onReject,
}: {
  request: SignupRequestListItem;
  onApprove: (request: SignupRequestListItem) => void;
  onReject: (request: SignupRequestListItem) => void;
}) {
  if (request.status === "pending") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onApprove(request)}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => onReject(request)}>
          Reject
        </Button>
      </div>
    );
  }

  if (
    request.status === "approved" &&
    request.provisioningStatus === "failed"
  ) {
    return <RetryProvisioningButton signupRequestId={request.id} />;
  }

  return (
    <span className="text-sm text-muted-foreground">
      <span aria-hidden="true">—</span>
      <span className="sr-only">No actions</span>
    </span>
  );
}

function RetryProvisioningButton({
  signupRequestId,
}: {
  signupRequestId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await retrySignupProvisioningAction(signupRequestId);
          if (Result.isError(result)) {
            toast.error(result.message);
            return;
          }

          if (result.value.provisioningStatus === "succeeded") {
            toast.success("Provisioning succeeded.");
            return;
          }

          toast.error("Provisioning ran again and is still failed.");
        });
      }}
    >
      Retry
    </Button>
  );
}
