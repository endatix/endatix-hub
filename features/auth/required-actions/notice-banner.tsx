"use client";

import { ReviewActionLink } from "./review-action-link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";

export function NoticeBanner({ href }: Readonly<{ href: string | null }>) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert role="status" variant="info">
      <AlertDescription>
        There is a pending account action. You can continue working.
      </AlertDescription>
      <AlertAction>
        <ReviewActionLink href={href} />
        <Button variant="ghost" onClick={() => setDismissed(true)}>
          Dismiss notice
        </Button>
      </AlertAction>
    </Alert>
  );
}
