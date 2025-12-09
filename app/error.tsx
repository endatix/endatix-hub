"use client"; // Error boundaries must be Client Components

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useTrackEvent } from "@/features/analytics/posthog";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { trackException } = useTrackEvent();

  useEffect(() => {
    trackException(error, {
      timestamp: new Date().toISOString()
    });
  }, [error, trackException]);

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Something went wrong!</AlertTitle>
      <AlertDescription>
        We are notified on the issue and are working on it.{" "}
        <b>Error details:</b> {error.message}
      </AlertDescription>
      <Button onClick={reset}>Click to Retry</Button>
    </Alert>
  );
}
