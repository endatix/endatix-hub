"use client";

import { useState, useTransition } from "react";
import { SectionTitle } from "@/components/headings/section-title";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { Database } from "lucide-react";
import { Result } from "@/lib/result";
import { prepareReportingExportAction } from "../prepare-reporting-export.action";

interface PrepareReportingExportCardProps {
  formId: string;
}

export function PrepareReportingExportCard({
  formId,
}: PrepareReportingExportCardProps) {
  const [isPending, startTransition] = useTransition();
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const handlePrepare = () => {
    startTransition(async () => {
      const result = await prepareReportingExportAction(formId);

      if (Result.isError(result)) {
        toast.error({
          title: "Prepare for export failed",
          description: result.message,
        });
        return;
      }

      const summary = result.value;
      const message = `Schema compiled (definition ${summary.formDefinitionId}). Backfill: ${summary.processed} processed, ${summary.skipped} skipped, ${summary.failed} failed (${summary.batches} batch${summary.batches === 1 ? "" : "es"}).`;
      setLastSummary(message);

      toast.success({
        title: "Form ready for reporting export",
        description: message,
      });
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle
        title="Reporting export (beta)"
        headingClassName="text-xl mt-4"
      />
      <p className="text-sm text-muted-foreground">
        Compiles the export schema and backfills completed submissions into the
        reporting read model. Use this when testing the new CSV/JSON export
        before running an export from the submissions page.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={handlePrepare}
        disabled={isPending}
      >
        {isPending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <Database className="mr-2 h-4 w-4" />
        )}
        {isPending ? "Preparing..." : "Prepare for export"}
      </Button>
      {lastSummary ? (
        <p className="text-sm text-muted-foreground" role="status">
          {lastSummary}
        </p>
      ) : null}
    </div>
  );
}
