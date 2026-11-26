"use client";

import type { ReactNode } from "react";
import type { Error as ResultError } from "@/lib/result";
import { Button } from "@/components/ui/button";
import { StandingRefusal } from "@/components/error-handling/standing-refusal";

interface Props {
  failure?: ResultError;
  retry: () => void;
  children: ReactNode;
}

export function FolderReadBoundary({
  failure,
  retry,
  children,
}: Readonly<Props>) {
  if (!failure) return children;
  if (failure.requiredAction)
    return <StandingRefusal refusal={failure.requiredAction} />;
  return (
    <div className="space-y-2 p-2">
      <p>{failure.message}</p>
      {failure.statusCode === 503 && (
        <Button type="button" variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
