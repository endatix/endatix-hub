"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileQuestion } from "lucide-react";
import { FileTableRow } from "./file-table-row";
import type { UserFileMetadata } from "@/features/asset-storage/types";

interface SubmissionFilesTableProps {
  files: UserFileMetadata[];
  formId: string;
  submissionId: string;
}

export function SubmissionFilesTable({
  files,
  formId,
  submissionId,
}: SubmissionFilesTableProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No files uploaded for this submission.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File name</TableHead>
          <TableHead>Original file name</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-[180px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const fileHref = `/forms/${formId}/submissions/${submissionId}/files/${encodeURIComponent(file.displayName)}`;
          const downloadApiUrl = `/api/hub/v0/storage/submission-files/${formId}/${submissionId}/${encodeURIComponent(file.displayName)}/download-url`;
          return (
            <FileTableRow
              key={file.displayName}
              fileHref={fileHref}
              downloadApiUrl={downloadApiUrl}
              displayName={file.displayName}
              originalFileName={file.originalFileName ?? "—"}
              questionName={file.questionName ?? "—"}
              contentType={file.contentType}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}
