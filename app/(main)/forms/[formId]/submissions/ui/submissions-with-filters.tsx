"use client";

import { ExportSubmissionsButton } from "@/features/submissions/ui/export";
import { SubmissionsFilterToolbar } from "@/features/submissions/ui/filters/submissions-filter-toolbar";
import { Submission } from "@/lib/endatix-api/submissions/types";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SubmissionsTable from "./submissions-table";

interface SubmissionsWithFiltersProps {
  data: Submission[];
  formId: string;
  initialIsComplete?: string[];
  initialStatus?: string[];
}

export function SubmissionsWithFilters({
  data,
  formId,
  initialIsComplete = [],
  initialStatus = [],
}: SubmissionsWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isCompleteFilter, setIsCompleteFilter] = useState<Set<string>>(
    new Set(initialIsComplete)
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(initialStatus)
  );

  const updateURL = (isComplete: Set<string>, status: Set<string>) => {
    const params = new URLSearchParams();

    if (isComplete.size > 0) {
      params.set("isComplete", Array.from(isComplete).join(","));
    }
    if (status.size > 0) {
      params.set("status", Array.from(status).join(","));
    }

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(url as Route, { scroll: false });
    });
  };

  const handleIsCompleteChange = (values: Set<string>) => {
    setIsCompleteFilter(values);
    updateURL(values, statusFilter);
  };

  const handleStatusChange = (values: Set<string>) => {
    setStatusFilter(values);
    updateURL(isCompleteFilter, values);
  };

  const handleResetFilters = () => {
    const emptySet = new Set<string>();
    setIsCompleteFilter(emptySet);
    setStatusFilter(emptySet);
    updateURL(emptySet, emptySet);
  };

  // Create a key that changes when filters change to force table re-mount
  const tableKey = `${Array.from(isCompleteFilter).sort().join(',')}-${Array.from(statusFilter).sort().join(',')}-${data.length}`;

  return (
    <>
      <div className="flex items-center justify-between gap-4 mt-8 mb-4">
        <SubmissionsFilterToolbar
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          onIsCompleteChange={handleIsCompleteChange}
          onStatusChange={handleStatusChange}
          onResetFilters={handleResetFilters}
        />
        <ExportSubmissionsButton formId={formId} />
      </div>
      {isPending && (
        <div className="text-sm text-muted-foreground">Updating...</div>
      )}
      <SubmissionsTable key={tableKey} data={data} formId={formId} />
    </>
  );
}
