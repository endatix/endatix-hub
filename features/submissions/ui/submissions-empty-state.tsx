"use client";

import { Button } from "@/components/ui/button";
import { Inbox, RotateCcw, Share2 } from "lucide-react";

interface NoSubmissionsEmptyStateProps {
  onShareForm?: () => void;
}

interface NoMatchingSubmissionsEmptyStateProps {
  onClearFilters: () => void;
}

export function NoSubmissionsEmptyState({
  onShareForm,
}: NoSubmissionsEmptyStateProps) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-sidebar-border/70 bg-background/70 text-muted-foreground/70">
        <Inbox className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        No submissions yet
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Responses will appear here as soon as someone submits this form.
      </p>
      {onShareForm && (
        <Button onClick={onShareForm} className="mt-6">
          <Share2 className="mr-2 h-4 w-4" />
          Share form
        </Button>
      )}
    </div>
  );
}

export function NoMatchingSubmissionsEmptyState({
  onClearFilters,
}: NoMatchingSubmissionsEmptyStateProps) {
  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-foreground">
        No submissions match current filters.
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Try changing or clearing the current filters.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="mt-5">
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  );
}
