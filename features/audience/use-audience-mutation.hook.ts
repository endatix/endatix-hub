"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";

type Mutation = {
  action: () => Promise<Result<unknown>>;
  successMessage: string;
  onSuccess?: () => void;
};

const REJECTED_MESSAGE = "Something went wrong. Try again.";

async function runAction(
  action: Mutation["action"],
): Promise<Result<unknown> | "rejected"> {
  try {
    return await action();
  } catch {
    return "rejected";
  }
}

/**
 * Runs one audience write from a panel or dialog. A failure stays in `error` for the caller to
 * show inside the overlay, which keeps its values; a success toasts, runs `onSuccess` (close the
 * overlay) and refreshes the server page so the table shows the result.
 */
export function useAudienceMutation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = ({ action, successMessage, onSuccess }: Mutation) => {
    setError(null);
    startTransition(async () => {
      const result = await runAction(action);
      if (result === "rejected") return setError(REJECTED_MESSAGE);
      if (Result.isError(result)) return setError(result.message);
      toast.success(successMessage);
      onSuccess?.();
      router.refresh();
    });
  };
  /** `status` is what an overlay shows: spread it into the panel's props. */
  const status = { pending, error };
  return { ...status, status, run, clearError: () => setError(null) };
}
