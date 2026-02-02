"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DownloadSubmissionFileButton } from "@/features/asset-storage/use-cases/download-user-file/download-submission-file-button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FileTableRowProps {
  fileHref: string;
  downloadApiUrl: string;
  displayName: string;
  originalFileName: string;
  questionName: string;
  contentType: string;
}

export function FileTableRow({
  fileHref,
  downloadApiUrl,
  displayName,
  originalFileName,
  questionName,
  contentType,
}: FileTableRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(fileHref as Parameters<typeof router.push>[0]);
  };

  return (
    <TableRow
      className="cursor-pointer"
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      <TableCell className="font-medium">{displayName}</TableCell>
      <TableCell className="text-muted-foreground">
        {originalFileName}
      </TableCell>
      <TableCell className="text-muted-foreground">{questionName}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          {contentType}
        </Badge>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <Button variant="default" size="sm" asChild>
            <Link
              href={fileHref as unknown as Parameters<typeof Link>[0]["href"]}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              View
            </Link>
          </Button>
          <DownloadSubmissionFileButton
            downloadApiUrl={downloadApiUrl}
            variant="outline"
            size="sm"
            className="gap-1.5"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
