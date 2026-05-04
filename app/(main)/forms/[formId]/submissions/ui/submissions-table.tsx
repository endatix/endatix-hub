"use client";

import { DataTable } from "@/features/submissions/ui/table";
import type { ParsedSubmission } from "@/features/submissions/ui/table";
import { Submission } from "@/lib/endatix-api";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

type SubmissionsTableProps = {
  data: Submission[];
  formId: string;
  columns: ColumnDef<ParsedSubmission>[];
  sorting?: SortingState;
  onSortingChange?: Dispatch<SetStateAction<SortingState>>;
  pagination?: PaginationState;
  onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;
  totalRecords?: number;
  totalPages?: number;
};

const SubmissionsTable = ({
  data,
  formId,
  columns,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  totalRecords,
  totalPages,
}: SubmissionsTableProps) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSubmissionId) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedSubmissionId(null); // Deselect
        return;
      }

      const currentIndex = data.findIndex((s) => s.id === selectedSubmissionId);
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : data.length - 1;
        setSelectedSubmissionId(data[prevIndex].id);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        const nextIndex = currentIndex < data.length - 1 ? currentIndex + 1 : 0;
        setSelectedSubmissionId(data[nextIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSubmissionId, data]);

  const parsedData: ParsedSubmission[] = data.map((submission) => ({
    ...submission,
    parsedData: (() => {
      try {
        return submission.jsonData
          ? JSON.parse(submission.jsonData as string)
          : {};
      } catch {
        return {};
      }
    })(),
  }));

  return (
    <DataTable
      data={parsedData}
      columns={columns}
      formId={formId}
      sorting={sorting}
      onSortingChange={onSortingChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      rowCount={totalRecords}
      pageCount={totalPages}
    />
  );
};

export default SubmissionsTable;
