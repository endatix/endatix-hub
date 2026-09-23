"use client";

import { copyValueToClipboard } from "@/components/copy-to-clipboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { LocaleLabel } from "@/components/common/locale-label";
import {
  ShareLinkRow,
  ShareLinkRowHeader,
} from "@/components/common/share-link-row";
import { withBasePath } from "@/lib/hosting";
import { Result } from "@/lib/result";
import {
  Eye,
  FileDown,
  FilePenLine,
  Link2,
  RefreshCw,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  createSubmissionAccessLinkAction,
  type SubmissionAccessLinkToken,
  type SubmissionAccessLinkType,
} from "./create-submission-access-links.action";
import {
  DEFAULT_EXPIRY_MINUTES,
  EXPIRY_OPTIONS,
  formatExpiresIn,
} from "./share-link-expiry";

interface SubmissionShareLinksDialogProps {
  formId: string;
  submissionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Catalog locale for PDF labels, chosen on the submission page. Pass it only
   * for a multi-language survey; omitted, the PDF uses the submitted language.
   */
  pdfLocale?: string;
}

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

function getPublicUrl(path: string, token: string, locale?: string): string {
  const params = new URLSearchParams({ token });
  if (locale) {
    params.set("locale", locale);
  }
  const route = withBasePath(`${path}?${params.toString()}`);
  if (globalThis.window !== undefined) {
    return `${globalThis.window.location.origin}${route}`;
  }

  return route;
}

function describeOption(option: ShareLinkOption, pdfLocale?: string) {
  if (option.type !== "export-pdf" || !pdfLocale) {
    return option.description;
  }

  return (
    <>
      {option.description} Labels in{" "}
      <LocaleLabel catalogLocale={pdfLocale} className="text-foreground" />, as
      selected on the submission.
    </>
  );
}

export function SubmissionShareLinksDialog({
  formId,
  submissionId,
  open,
  onOpenChange,
  pdfLocale,
}: SubmissionShareLinksDialogProps) {
  const [expiryMinutes, setExpiryMinutes] = useState(DEFAULT_EXPIRY_MINUTES);
  const [links, setLinks] = useState<
    Partial<Record<SubmissionAccessLinkType, SubmissionAccessLinkToken>>
  >({});
  const [pendingTypes, setPendingTypes] = useState<
    Partial<Record<SubmissionAccessLinkType, true>>
  >({});
  const [, startTransition] = useTransition();
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof globalThis.navigator?.share === "function");
  }, []);

  const handleGenerate = (option: ShareLinkOption) => {
    setPendingTypes((current) =>
      current[option.type] ? current : { ...current, [option.type]: true },
    );

    startTransition(async () => {
      const result = await createSubmissionAccessLinkAction(
        formId,
        submissionId,
        option.type,
        expiryMinutes,
      );

      setPendingTypes((current) => {
        const next = { ...current };
        delete next[option.type];
        return next;
      });

      if (Result.isError(result)) {
        toast.error({ title: result.message });
        return;
      }

      setLinks((current) => ({ ...current, [option.type]: result.value }));

      const copied = await copyValueToClipboard(
        getPublicUrl(
          `${option.path}/${formId}`,
          result.value.token,
          option.type === "export-pdf" ? pdfLocale : undefined,
        ),
      );

      if (!copied) {
        toast.success({ title: `${option.label} link generated` });
      }
    });
  };

  const handleNativeShare = async (option: ShareLinkOption, url: string) => {
    try {
      await globalThis.navigator.share({
        title: `${option.label} submission`,
        url,
      });
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] gap-3 overflow-y-auto sm:max-w-2xl"
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
          <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label
                htmlFor="share-link-expiry"
                className="text-sm font-medium"
              >
                Link lifetime
              </Label>
              <p className="text-xs text-muted-foreground">
                Applies to links you generate next. Links already generated keep
                the lifetime they were created with.
              </p>
            </div>

            <Select
              value={String(expiryMinutes)}
              onValueChange={(value) => setExpiryMinutes(Number(value))}
            >
              <SelectTrigger
                id="share-link-expiry"
                className="h-9 w-full sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {SHARE_LINK_OPTIONS.map((option) => {
            const generated = links[option.type];
            const isPending = pendingTypes[option.type] === true;
            const localeQuery =
              option.type === "export-pdf" ? pdfLocale : undefined;
            const description = describeOption(option, pdfLocale);

            if (!generated) {
              return (
                <section
                  key={option.type}
                  className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3"
                >
                  <ShareLinkRowHeader
                    icon={option.icon}
                    title={option.label}
                    description={description}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={isPending}
                    onClick={() => handleGenerate(option)}
                  >
                    {isPending ? "Generating..." : "Generate"}
                  </Button>
                </section>
              );
            }

            const url = getPublicUrl(
              `${option.path}/${formId}`,
              generated.token,
              localeQuery,
            );

            return (
              <ShareLinkRow
                key={option.type}
                icon={option.icon}
                title={option.label}
                description={description}
                value={url}
                copyLabel={`Copy ${option.label} link`}
                className="gap-2 p-3"
                actions={
                  <>
                    {canNativeShare && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleNativeShare(option, url)}
                        aria-label={`Share ${option.label} link`}
                      >
                        <Share2 className="size-4" aria-hidden />
                        <span className="sr-only sm:not-sr-only">Share</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleGenerate(option)}
                      aria-label={`Regenerate ${option.label} link`}
                    >
                      <RefreshCw className="size-4" aria-hidden />
                      <span className="sr-only sm:not-sr-only">
                        {isPending ? "Working..." : "Regenerate"}
                      </span>
                    </Button>
                  </>
                }
                footer={
                  <span title={new Date(generated.expiresAt).toLocaleString()}>
                    {formatExpiresIn(generated.expiresAt)} ·{" "}
                    {new Date(generated.expiresAt).toLocaleString()}
                  </span>
                }
              />
            );
          })}

          <p className="text-xs text-muted-foreground">
            Anyone with a link can use it until it expires. Regenerating issues
            a new link; the previous one keeps working until its own expiry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
