"use client";

import { toast } from "@/components/ui/toast";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useTransition } from "react";
import { changeStatusAction } from "./change-status.action";
import { ChangeStatusResult } from "./types";
import { SubmissionStatus, SubmissionStatusKind } from "@/types";

interface UseSubmissionStatusProps {
  submissionId: string;
  formId: string;
  status: string;
}

const toFailedStatusChange = (error: unknown): ChangeStatusResult => {
  if (isRedirectError(error)) {
    throw error;
  }
  return { success: false };
};

export const useSubmissionStatus = ({
  submissionId,
  formId,
  status,
}: UseSubmissionStatusProps) => {
  const [isPending, startTransition] = useTransition();
  const currentStatus = SubmissionStatus.fromCode(status);
  const nextStatus = currentStatus.isNew()
    ? SubmissionStatus.fromCode(SubmissionStatusKind.Read)
    : SubmissionStatus.fromCode(SubmissionStatusKind.New);

  const handleStatusChange = () => {
    startTransition(async () => {
      const statusResult = await changeStatusAction({
        submissionId,
        formId,
        status: nextStatus.value,
      }).catch(toFailedStatusChange);

      if (statusResult.success) {
        toast.success("Status updated successfully");
      } else {
        toast.error(statusResult.error ?? "Failed to update status");
      }
    });
  };

  return {
    isPending,
    nextStatus,
    handleStatusChange,
  };
};
