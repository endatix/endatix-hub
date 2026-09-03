"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, XIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Result, type ResultType } from "@/lib/result";

interface SupportAccessBannerViewProps {
  /** Absent until the tenant name streams in, or if it could not be read. */
  tenantName?: string;
  /** Resolves only on failure — a successful exit redirects. */
  exitAction: () => Promise<ResultType<unknown>>;
}

export function SupportAccessBannerView({
  tenantName,
  exitAction,
}: Readonly<SupportAccessBannerViewProps>) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExiting, startExit] = useTransition();

  if (isDismissed) {
    return null;
  }

  const exit = () =>
    startExit(async () => {
      const result = await exitAction();
      if (Result.isError(result)) {
        toast.error(result.message || "Failed to exit tenant");
      }
    });

  return (
    <Alert
      variant="warning"
      className="sticky top-0 z-50 grid-cols-[auto_1fr] items-center gap-x-2 rounded-none border-x-0 py-2 shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-3"
      data-slot="support-access-banner"
    >
      <ShieldAlert aria-hidden="true" />
      <div className="col-start-2 flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
        <AlertTitle className="col-start-auto min-h-0 shrink-0">
          {tenantName ? `Support access — ${tenantName}` : "Support access"}
        </AlertTitle>
        <AlertDescription className="col-start-auto line-clamp-2 md:line-clamp-1">
          You are viewing this tenant as a platform administrator. You are not a
          member of the tenant.
        </AlertDescription>
      </div>
      <AlertAction className="col-start-2 mt-1 flex items-center gap-1 md:col-start-3 md:row-start-1 md:mt-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isExiting}
          onClick={exit}
        >
          {isExiting ? "Exiting…" : "Exit tenant"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss support access banner"
          onClick={() => setIsDismissed(true)}
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}
