"use client";

import { toast } from "@/components/ui/toast";
import {
  prepareReportingExportAction,
  refreshIncompleteSubmissionsAction,
} from "@/features/export/server";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  includeInProgressOutcome,
  prepareOutcome,
  type ReadinessActionOutcome,
} from "../readiness-action-outcome";

export type ReadinessAction = "prepare" | "includeInProgress";

const ACTIONS: Record<
  ReadinessAction,
  (formId: string) => Promise<ReadinessActionOutcome>
> = {
  prepare: async (formId) =>
    prepareOutcome(await prepareReportingExportAction(formId)),
  includeInProgress: async (formId) =>
    includeInProgressOutcome(await refreshIncompleteSubmissionsAction(formId)),
};

/**
 * Runs Prepare or Include in-progress, says how it went, and reads the grid
 * again so the rows and counts show the new data.
 */
export function useReadinessActions(formId: string) {
  const router = useRouter();
  const [running, setRunning] = useState<ReadinessAction | null>(null);
  const [isPending, startTransition] = useTransition();
  const run = (action: ReadinessAction) => {
    setRunning(action);
    startTransition(async () => {
      const outcome = await ACTIONS[action](formId);
      toast[outcome.variant](outcome.message);
      if (outcome.refresh) router.refresh();
    });
  };

  return { running: isPending ? running : null, run };
}
