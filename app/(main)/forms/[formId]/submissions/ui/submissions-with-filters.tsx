"use client";

import { Button } from "@/components/ui/button";
import { ExportSubmissionsButton } from "@/features/submissions/ui/export";
import { SubmissionsFilterToolbar } from "@/features/submissions/ui/filters/submissions-filter-toolbar";
import {
  buildSubmissionDataColumns,
  ColumnOrderProvider,
  COLUMNS_DEFINITION,
  useColumnOrder,
} from "@/features/submissions/ui/table";
import { DefinitionField } from "@/lib/endatix-api";
import { Submission } from "@/lib/endatix-api/submissions/types";
import { RotateCcw } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SubmissionsTable from "./submissions-table";

interface SubmissionsWithFiltersProps {
  data: Submission[];
  formId: string;
  definitionFields?: DefinitionField[];
  initialIsComplete?: string[];
  initialStatus?: string[];
}

function SubmissionsContent({
  data,
  formId,
  definitionFields,
  isCompleteFilter,
  statusFilter,
  onIsCompleteChange,
  onStatusChange,
  onResetFilters,
  isPending,
  tableKey,
}: {
  data: Submission[];
  formId: string;
  definitionFields: DefinitionField[];
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  onIsCompleteChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onResetFilters: () => void;
  isPending: boolean;
  tableKey: string;
}) {
  const { resetToDefault, hasCustomOrder } = useColumnOrder();

  return (
    <>
      <div className="flex items-center justify-between gap-4 mt-8 mb-4">
        <SubmissionsFilterToolbar
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          onIsCompleteChange={onIsCompleteChange}
          onStatusChange={onStatusChange}
          onResetFilters={onResetFilters}
        />
        <div className="flex items-center gap-2">
          {hasCustomOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              className="px-2 lg:px-3"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Columns
            </Button>
          )}
          <ExportSubmissionsButton formId={formId} />
        </div>
      </div>
      {isPending && (
        <div className="text-sm text-muted-foreground">Updating...</div>
      )}
      <SubmissionsTable key={tableKey} data={data} formId={formId} definitionFields={definitionFields} />
    </>
  );
}

export function SubmissionsWithFilters({
  data,
  formId,
  definitionFields = [],
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
  const tableKey = `${Array.from(isCompleteFilter).sort((a, b) => a.localeCompare(b)).join(',')}-${Array.from(statusFilter).sort((a, b) => a.localeCompare(b)).join(',')}-${data.length}`;

  const allColumns = [...COLUMNS_DEFINITION, ...buildSubmissionDataColumns(definitionFields)];

  return (
    <ColumnOrderProvider formId={formId} defaultColumns={allColumns}>
      <SubmissionsContent
        data={data}
        formId={formId}
        definitionFields={definitionFields}
        isCompleteFilter={isCompleteFilter}
        statusFilter={statusFilter}
        onIsCompleteChange={handleIsCompleteChange}
        onStatusChange={handleStatusChange}
        onResetFilters={handleResetFilters}
        isPending={isPending}
        tableKey={tableKey}
      />
    </ColumnOrderProvider>
  );
}
