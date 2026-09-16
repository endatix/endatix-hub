"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/hosting/base-path";

/**
 * Posts to the retry handler, which reads the stored link server-side. No URL
 * is passed from here, so the access token never reaches the browser's DOM.
 *
 * The cooldown comes from the failure: a timed-out render is still running, so
 * it waits longer than an upstream failure that may already have recovered.
 */
export function RetryExportButton({
  cooldownSeconds,
}: {
  cooldownSeconds: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(cooldownSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const waiting = secondsLeft > 0;

  return (
    <form method="post" action={withBasePath("/export-error/retry")}>
      <Button type="submit" disabled={waiting} className="tabular-nums">
        {waiting ? `Try again in ${secondsLeft}s` : "Try again"}
      </Button>
    </form>
  );
}
