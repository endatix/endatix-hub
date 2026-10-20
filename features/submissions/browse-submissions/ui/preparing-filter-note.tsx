"use client";

import { Button } from "@/components/ui/button";
import { Hourglass, RefreshCw } from "lucide-react";
import { useRefreshColumns } from "@/features/submissions/ui/use-search-key-changes.hook";

export function PreparingFilterNote() {
  const { isPending, refresh } = useRefreshColumns();
  return (
    <div className="w-56 space-y-2 text-xs">
      <PreparingHint />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isPending}
        onClick={refresh}
      >
        <RefreshCw className="size-3.5" />
        Refresh
      </Button>
    </div>
  );
}

function PreparingHint() {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <Hourglass aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      This filter is being prepared. It works once every answer is ready.
    </p>
  );
}
