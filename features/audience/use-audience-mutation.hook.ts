"use client";

import { useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";

type Mutation = {
  action: () => Promise<Result<unknown>>;
  successMessage: string;
  onSuccess?: () => void;
  /** Where to go after it succeeds, when the page it ran on no longer applies; else refresh. */
  navigateTo?: Route;
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
 * overlay) and refreshes the server page so the table shows the result, or goes to `navigateTo`.
 */
export function useAudienceMutation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = ({ action, successMessage, onSuccess, navigateTo }: Mutation) => {
    setError(null);
    startTransition(async () => {
      const result = await runAction(action);
      if (result === "rejected") return setError(REJECTED_MESSAGE);
      if (Result.isError(result)) return setError(result.message);
      toast.success(successMessage);
      onSuccess?.();
      if (navigateTo) router.push(navigateTo);
      else router.refresh();
    });
  };
  /** `status` is what an overlay shows: spread it into the panel's props. */
  const status = { pending, error };
  return { ...status, status, run, clearError: () => setError(null) };
}
