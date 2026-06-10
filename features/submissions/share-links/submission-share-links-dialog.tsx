"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { ShareLinkRow } from "@/features/share-links/ui/share-link-row";
import { withBasePath } from "@/lib/hosting";
import { Result } from "@/lib/result";
import {
  Clock,
  Eye,
  FileDown,
  FilePenLine,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  createSubmissionAccessLinksAction,
  type SubmissionAccessLinksTokens,
} from "./create-submission-access-links.action";

interface SubmissionShareLinksDialogProps {
  formId: string;
  submissionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShareLink = {
  label: string;
  description: string;
  value: string;
  icon: LucideIcon;
};

function getPublicUrl(path: string, token: string): string {
  const route = withBasePath(`${path}?token=${encodeURIComponent(token)}`);
  if (globalThis.window !== undefined) {
    return `${globalThis.window.location.origin}${route}`;
  }

  return route;
}

function buildLinks(
  formId: string,
  tokens: SubmissionAccessLinksTokens,
): ShareLink[] {
  return [
    {
      label: "View",
      description: "Read-only submission view.",
      value: getPublicUrl(`/view/${formId}`, tokens.viewToken),
      icon: Eye,
    },
    {
      label: "Edit",
      description: "Read/write edit link for this submission.",
      value: getPublicUrl(`/edit/${formId}`, tokens.editToken),
      icon: FilePenLine,
    },
    {
      label: "Share",
      description: "Read/write survey continuation link.",
      value: getPublicUrl(`/share/${formId}`, tokens.editToken),
      icon: Link2,
    },
    {
      label: "Export PDF",
      description: "PDF export link for this submission.",
      value: getPublicUrl(`/export-pdf/${formId}`, tokens.exportToken),
      icon: FileDown,
    },
  ];
}

export function SubmissionShareLinksDialog({
  formId,
  submissionId,
  open,
  onOpenChange,
}: SubmissionShareLinksDialogProps) {
  const [tokens, setTokens] = useState<SubmissionAccessLinksTokens | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const links = tokens ? buildLinks(formId, tokens) : [];

  const handleGenerateLinks = () => {
    startTransition(async () => {
      const result = await createSubmissionAccessLinksAction(
        formId,
        submissionId,
      );

      if (Result.isError(result)) {
        toast.error({ title: result.message });
        return;
      }

      setTokens(result.value);
      toast.success({ title: "Share links generated" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-3 sm:max-w-2xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>Share Submission</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            Generate short-lived links for this submission. Private surveys are
            authorized by the signed access token.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {!tokens && (
            <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Create access links</p>
                <p className="text-xs text-muted-foreground">
                  Generate fresh links for view, edit, continuation, and PDF
                  export access.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleGenerateLinks}
                disabled={isPending}
                className="shrink-0"
                size="sm"
              >
                {isPending ? "Generating..." : "Generate links"}
              </Button>
            </div>
          )}

          {tokens && (
            <>
              <Alert className="border-warning/30 bg-warning/10 py-2 text-warning">
                <Clock className="size-4" />
                <AlertTitle className="text-sm">Temporary access</AlertTitle>
                <AlertDescription className="text-xs text-warning">
                  Links expire at {new Date(tokens.expiresAt).toLocaleString()}.
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <ShareLinkRow
                    key={link.label}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    value={link.value}
                    copyLabel={`Copy ${link.label} link`}
                    className="gap-2 p-3"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
