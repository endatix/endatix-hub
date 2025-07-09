"use client";

import { ExportSubmissionsButton } from "@/features/submissions/ui/export";
import { COLUMNS_DEFINITION, DataTable } from "@/features/submissions/ui/table";
import { Submission } from "@/lib/endatix-api";
import { useEffect, useState } from "react";

type SubmissionsTableProps = {
  data: Submission[];
  formId: string;
};

const SubmissionsTable = ({ data, formId }: SubmissionsTableProps) => {
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

  return (
    <>
      <div className="flex justify-end mb-4">
        <ExportSubmissionsButton formId={formId} />
      </div>
      <DataTable data={data} columns={COLUMNS_DEFINITION} />
    </>
  );
};

export default SubmissionsTable;
