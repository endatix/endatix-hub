"use client";

import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { Download, FilePenLine } from "lucide-react";
import Link from "next/link";
import { SubmissionActionsDropdown } from "./submission-actions-dropdown";
import { useState } from "react";
import { Spinner } from "@/components/loaders/spinner";
import { saveToFileHandler } from "survey-creator-core";
import { toast } from "@/components/ui/toast";
import { useTrackEvent } from "@/features/analytics/posthog";
import { SubmissionViewOptions } from "./submission-view-options";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";
import { getLanguageDisplayName } from "../../submission-localization";

interface SubmissionHeaderProps {
  submissionId: string;
  formId: string;
  status: string;
  submissionLocale: string | undefined;
}

export function SubmissionHeader({
  submissionId,
  formId,
  status,
  submissionLocale,
}: SubmissionHeaderProps) {
  const [loading, setLoading] = useState(false);
  const { trackEvent } = useTrackEvent();
  const { options } = useSubmissionDetailsViewOptions();
  const submissionLanguageName = getLanguageDisplayName(submissionLocale);

  const exportPdf = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!options.useSubmissionLanguage) {
        params.set("defaultLocale", "true");
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/public/v0/forms/${formId}/submissions/${submissionId}/export-pdf${query}`;
      const pdfFileName = `submission-${submissionId}.pdf`;
      const fileResponse = await fetch(url);
      if (fileResponse.ok) {
        const blob = new Blob([await fileResponse.arrayBuffer()], {
          type: "text/plain;charset=utf-8",
        });
        saveToFileHandler(pdfFileName, blob);

        // Track successful PDF export
        trackEvent("submission_export_pdf", {
          form_id: formId,
          submission_id: submissionId,
          file_name: pdfFileName,
          file_size: blob.size,
        });

        toast.success("PDF exported successfully");
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);

      // Track export failure
      trackEvent("submission_export_pdf_error", {
        form_id: formId,
        submission_id: submissionId,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-2 flex flex-col gap-6 sm:gap-2 sm:flex-row justify-between">
      <PageTitle title="Submission Details" />
      <div className="flex space-x-2 justify-end text-muted-foreground">
        <SubmissionViewOptions
          submissionLanguageName={submissionLanguageName}
        />
        <Button
          variant={"outline"}
          onClick={() => exportPdf()}
          disabled={loading}
        >
          {loading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? "Exporting..." : "Export PDF"}
        </Button>

        <Button variant={"outline"} asChild className="hidden md:flex">
          <Link href={`/forms/${formId}/submissions/${submissionId}/edit`}>
            <FilePenLine className="h-4 w-4" />
            Edit
          </Link>
        </Button>

        <SubmissionActionsDropdown
          formId={formId}
          submissionId={submissionId}
          status={status}
          className="text-muted-foreground"
        />
      </div>
    </div>
  );
}
