"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Inbox, RotateCcw, Share2 } from "lucide-react";

interface NoSubmissionsEmptyStateProps {
  readonly onShareForm?: () => void;
}

interface NoMatchingSubmissionsEmptyStateProps {
  readonly onClearFilters: () => void;
}

export function NoSubmissionsEmptyState({
  onShareForm,
}: NoSubmissionsEmptyStateProps) {
  return (
    <Empty className="min-h-[18rem] border-sidebar-border/50 py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox className="h-6 w-6" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No submissions yet</EmptyTitle>
        <EmptyDescription>
          Responses will appear here as soon as someone submits this form.
        </EmptyDescription>
      </EmptyHeader>
      {onShareForm ? (
        <EmptyContent>
          <Button onClick={onShareForm}>
            <Share2 className="mr-2 h-4 w-4" />
            Share form
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export function NoMatchingSubmissionsEmptyState({
  onClearFilters,
}: NoMatchingSubmissionsEmptyStateProps) {
  return (
    <Empty className="min-h-[14rem] border-sidebar-border/50 py-12">
      <EmptyHeader>
        <EmptyTitle>No submissions match current filters.</EmptyTitle>
        <EmptyDescription>
          Try changing or clearing the current filters.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClearFilters}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}
