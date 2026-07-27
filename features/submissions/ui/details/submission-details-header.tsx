"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { useTrackEvent } from "@/features/analytics/posthog";
import { getSubmissionListReturnPath } from "@/features/submissions/list-submission-query";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FilePenLine,
  Files,
  LinkIcon,
  MoreVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { saveToFileHandler } from "survey-creator-core";
import { StatusDropdownMenuItem } from "../../use-cases/change-status";
import { DeleteSubmissionDialog } from "../../use-cases/delete-submission";
import { SubmissionShareLinksDialog } from "../../share-links/submission-share-links-dialog";
import { DownloadFilesDropdownItem } from "../download-files-dropdown-item";
import {
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "./submission-details-context";

interface SubmissionDetailsHeaderProps {
  submissionId: string;
  formId: string;
}

export function SubmissionDetailsHeader({
  submissionId,
  formId,
}: Readonly<SubmissionDetailsHeaderProps>) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [isShareLinksOpen, setIsShareLinksOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [listHref, setListHref] = useState(`/forms/${formId}/submissions`);
  const { data: session } = useSession();
  const { trackEvent } = useTrackEvent();
  const { viewOptions } = useSubmissionDetailsViewOptions();
  const { submission } = useSubmissionDetails();

  useEffect(() => {
    setListHref(getSubmissionListReturnPath(formId));
  }, [formId]);

  const handleExportPdfClick = async () => {
    try {
      setPdfLoading(true);
      const params = new URLSearchParams();
      if (!viewOptions.useSubmissionLanguage) {
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

        trackEvent("submission_export_pdf", {
          form_id: formId,
          submission_id: submissionId,
          file_name: pdfFileName,
          file_size: blob.size,
        });

        toast.success("PDF exported successfully");
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
      trackEvent("submission_export_pdf_error", {
        form_id: formId,
        submission_id: submissionId,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyJson = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(submission, null, 2));
      toast.success("Submission JSON copied to clipboard");
      trackEvent("submission_copy_json", {
        form_id: formId,
        submission_id: submissionId,
      });
      setJsonCopied(true);
      setTimeout(() => {
        setJsonCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy JSON:", error);
      toast.error("Failed to copy JSON to clipboard");
      trackEvent("submission_copy_json_error", {
        form_id: formId,
        submission_id: submissionId,
        error_message: error instanceof Error ? error.message : "Unknown",
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-slate-200/50 bg-white/80 px-3 py-3 shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl sm:px-4 sm:py-4 lg:px-8 dark:border-slate-800/50 dark:bg-slate-950/80">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Link
            href={listHref as Route}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Back to submissions</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleExportPdfClick}
            disabled={pdfLoading}
            className="flex items-center gap-2"
          >
            {pdfLoading ? (
              <Spinner className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyJson}
            disabled={copying || jsonCopied}
            title="Copy JSON"
            className="flex items-center gap-2"
          >
            {jsonCopied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="hidden sm:inline">Copy JSON</span>
          </Button>
          <Button variant="outline" asChild className="hidden sm:flex">
            <Link href={`/forms/${formId}/submissions/${submissionId}/edit`}>
              <FilePenLine className="size-4" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
          </Button>
          <SubmissionActionsDropdown
            formId={formId}
            submissionId={submissionId}
            status={submission.status}
            onShareLinksOpen={() => setIsShareLinksOpen(true)}
            onDeleteOpen={() => setIsDeleteOpen(true)}
            className="text-muted-foreground"
          />
        </div>
      </header>
      <SubmissionShareLinksDialog
        formId={formId}
        submissionId={submissionId}
        open={isShareLinksOpen}
        onOpenChange={setIsShareLinksOpen}
      />
      <DeleteSubmissionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        formId={formId}
        submissionId={submissionId}
        isTestSubmission={submission.isTestSubmission}
        submitterId={submission.submitterId}
        submitterDisplayId={submission.submitterDisplayId}
        currentUserId={session?.user?.id}
        redirectToList
      />
    </>
  );
}

interface SubmissionActionsDropdownProps extends React.ComponentProps<
  typeof Button
> {
  submissionId: string;
  formId: string;
  status: string;
  onShareLinksOpen: () => void;
  onDeleteOpen: () => void;
}

function SubmissionActionsDropdown({
  submissionId,
  formId,
  status,
  onShareLinksOpen,
  onDeleteOpen,
  ...props
}: Readonly<SubmissionActionsDropdownProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          {...props}
          className={cn("flex items-center pr-2 pl-2", props.className)}
          aria-haspopup="true"
          variant="ghost"
          size="icon"
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-muted-foreground" align="end">
        <DropdownMenuItem className="cursor-pointer md:hidden" asChild>
          <Link href={`/forms/${formId}/submissions/${submissionId}/edit`}>
            <FilePenLine className="mr-2 size-4" />
            <span>Edit</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/forms/${formId}/submissions/${submissionId}/files`}>
            <Files className="mr-2 size-4" />
            <span>View Files</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={onShareLinksOpen}
        >
          <LinkIcon className="mr-2 size-4" />
          <span>Share Links</span>
        </DropdownMenuItem>

        <DownloadFilesDropdownItem
          formId={formId}
          submissionId={submissionId}
        />

        <DropdownMenuSeparator />

        <StatusDropdownMenuItem
          className="cursor-pointer md:hidden"
          submissionId={submissionId}
          formId={formId}
          status={status}
        />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={onDeleteOpen}
        >
          <Trash2 className="mr-2 size-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
