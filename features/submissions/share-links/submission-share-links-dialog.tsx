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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createSubmissionAccessLinkAction,
  type SubmissionAccessLinkToken,
  type SubmissionAccessLinkType,
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

type ShareLinkOption = {
  type: SubmissionAccessLinkType;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

const SHARE_LINK_OPTIONS: ShareLinkOption[] = [
  {
    type: "share",
    label: "Share",
    description: "Continue and complete this submission.",
    path: "/share",
    icon: Link2,
  },
  {
    type: "view",
    label: "View",
    description: "Read-only submission view.",
    path: "/view",
    icon: Eye,
  },
  {
    type: "edit",
    label: "Edit",
    description: "Read/write edit link for this submission.",
    path: "/edit",
    icon: FilePenLine,
  },
  {
    type: "export-pdf",
    label: "Export PDF",
    description: "PDF export link for this submission.",
    path: "/export-pdf",
    icon: FileDown,
  },
];

function getPublicUrl(path: string, token: string): string {
  const route = withBasePath(`${path}?token=${encodeURIComponent(token)}`);
  if (globalThis.window !== undefined) {
    return `${globalThis.window.location.origin}${route}`;
  }

  return route;
}

function getLinkOption(type: SubmissionAccessLinkType): ShareLinkOption {
  return (
    SHARE_LINK_OPTIONS.find((option) => option.type === type) ??
    SHARE_LINK_OPTIONS[0]
  );
}

function buildLink(
  formId: string,
  generatedLink: SubmissionAccessLinkToken,
): ShareLink {
  const option = getLinkOption(generatedLink.type);

  return {
    label: option.label,
    description: option.description,
    value: getPublicUrl(`${option.path}/${formId}`, generatedLink.token),
    icon: option.icon,
  };
}

export function SubmissionShareLinksDialog({
  formId,
  submissionId,
  open,
  onOpenChange,
}: SubmissionShareLinksDialogProps) {
  const [selectedType, setSelectedType] =
    useState<SubmissionAccessLinkType>("share");
  const [generatedLink, setGeneratedLink] =
    useState<SubmissionAccessLinkToken | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedOption = getLinkOption(selectedType);
  const generatedShareLink = generatedLink
    ? buildLink(formId, generatedLink)
    : null;
  const SelectedIcon = selectedOption.icon;

  const handleTypeChange = (type: SubmissionAccessLinkType) => {
    setSelectedType(type);
    setGeneratedLink(null);
  };

  const handleGenerateLink = () => {
    startTransition(async () => {
      const result = await createSubmissionAccessLinkAction(
        formId,
        submissionId,
        selectedType,
      );

      if (Result.isError(result)) {
        toast.error({ title: result.message });
        return;
      }

      setGeneratedLink(result.value);
      toast.success({
        title: `${getLinkOption(selectedType).label} link generated`,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-3 sm:max-w-2xl"
        // The trigger lives inside clickable submission UI; stop both pointer
        // and click bubbling so parent row/menu handlers do not also fire.
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
          <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-3">
            <div>
              <p className="text-sm font-medium">General access</p>
              <p className="text-xs text-muted-foreground">
                Choose the type of short-lived link to generate.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:size-4">
                  <SelectedIcon />
                </div>

                <div className="min-w-0 flex-1">
                  <Select
                    value={selectedType}
                    onValueChange={(value) =>
                      handleTypeChange(value as SubmissionAccessLinkType)
                    }
                  >
                    <SelectTrigger className="h-9 w-full border-0 bg-transparent px-0 text-base font-medium shadow-none focus:ring-0 sm:max-w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHARE_LINK_OPTIONS.map((option) => (
                        <SelectItem key={option.type} value={option.type}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {selectedOption.description}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGenerateLink}
                disabled={isPending}
                className="shrink-0"
                size="sm"
              >
                {isPending ? "Generating..." : "Generate link"}
              </Button>
            </div>
          </div>

          {generatedLink && generatedShareLink && (
            <>
              <Alert className="border-warning/30 bg-warning/10 py-2 text-warning">
                <Clock className="size-4" />
                <AlertTitle className="text-sm">Temporary access</AlertTitle>
                <AlertDescription className="text-xs text-warning">
                  Link expires at{" "}
                  {new Date(generatedLink.expiresAt).toLocaleString()}.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <ShareLinkRow
                  icon={generatedShareLink.icon}
                  title={generatedShareLink.label}
                  description={generatedShareLink.description}
                  value={generatedShareLink.value}
                  copyLabel={`Copy ${generatedShareLink.label} link`}
                  className="gap-2 p-3"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
