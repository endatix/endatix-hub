"use client";

import { RefreshSearchKeysButton } from "@/features/submissions/ui/search-key-buttons";
import { useRefreshColumns } from "@/features/submissions/ui/use-search-key-changes.hook";
import { Hourglass } from "lucide-react";

export function PreparingFilterNote() {
  const changes = useRefreshColumns();
  return (
    <div className="w-56 space-y-2 text-xs">
      <PreparingHint />
      <RefreshSearchKeysButton
        changes={changes}
        variant="outline"
        className="w-full"
      />
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
