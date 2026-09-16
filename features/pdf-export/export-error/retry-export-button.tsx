"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/hosting/base-path";

/**
 * Seconds before the retry becomes clickable.
 *
 * The render that just failed is still running - the deadline stops us waiting,
 * it does not cancel the work - so an instant retry would add load to a server
 * that has not finished shedding the last request.
 */
const COOLDOWN_SECONDS = 10;

/**
 * Posts to the retry handler, which reads the stored link server-side. No URL
 * is passed from here, so the access token never reaches the browser's DOM.
 */
export function RetryExportButton() {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

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
