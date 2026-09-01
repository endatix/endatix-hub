"use client";

import { useState } from "react";
import { ShieldAlert, XIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SupportAccessBannerViewProps {
  title: string;
  exitAction: () => void | Promise<void>;
}

export function SupportAccessBannerView({
  title,
  exitAction,
}: Readonly<SupportAccessBannerViewProps>) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      className="sticky top-0 z-50 rounded-none border-x-0 py-2 shadow-sm grid-cols-[auto_1fr] items-center gap-x-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-3"
      data-slot="support-access-banner"
    >
      <ShieldAlert aria-hidden="true" />
      <div className="col-start-2 flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
        <AlertTitle className="col-start-auto min-h-0 shrink-0">{title}</AlertTitle>
        <AlertDescription className="col-start-auto line-clamp-2 md:line-clamp-1">
          You are viewing this tenant as a platform administrator. You are not a
          member of the tenant.
        </AlertDescription>
      </div>
      <AlertAction className="col-start-2 mt-1 flex items-center gap-1 md:col-start-3 md:row-start-1 md:mt-0">
        <form action={exitAction}>
          <Button type="submit" variant="outline" size="sm">
            Exit tenant
          </Button>
        </form>
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
