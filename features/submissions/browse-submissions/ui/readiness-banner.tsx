"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import type { GridReadinessBanner } from "../grid-readiness";
import {
  useReadinessActions,
  type ReadinessAction,
} from "./use-readiness-actions.hook";

type ReadinessBannerProps = {
  formId: string;
  banner: GridReadinessBanner;
};

/** Says which submissions are not prepared and offers to prepare them. */
export function ReadinessBanner({
  formId,
  banner,
}: Readonly<ReadinessBannerProps>) {
  return (
    <Alert variant="info" className="mb-4">
      <Info />
      <AlertTitle>{banner.title}</AlertTitle>
      <AlertDescription>
        {banner.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <ReadinessActions formId={formId} banner={banner} />
      </AlertDescription>
    </Alert>
  );
}

const ACTION_LABELS: Record<ReadinessAction, string> = {
  prepare: "Prepare",
  includeInProgress: "Include in-progress submissions",
};

function offeredActions(banner: GridReadinessBanner): ReadinessAction[] {
  return [
    banner.showPrepare && ("prepare" as const),
    banner.showIncludeInProgress && ("includeInProgress" as const),
  ].filter((action): action is ReadinessAction => action !== false);
}

function ReadinessActions({ formId, banner }: Readonly<ReadinessBannerProps>) {
  const { running, run } = useReadinessActions(formId);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {offeredActions(banner).map((action) => (
        <Button
          key={action}
          size="sm"
          variant="outline"
          disabled={running !== null}
          onClick={() => run(action)}
        >
          {running === action && <Spinner className="mr-2 h-3 w-3" />}
          {ACTION_LABELS[action]}
        </Button>
      ))}
    </div>
  );
}
