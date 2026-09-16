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
import { ShareLinkRow } from "@/features/share-links/ui/share-link-row";
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
}

type ShareLinkOption = {
  type: SubmissionAccessLinkType;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

/**
 * Every link type is shown at once. Four is few enough that a picker only hides
 * three of them behind a click, and the type is what someone came here to pick.
 */
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

export function SubmissionShareLinksDialog({
  formId,
  submissionId,
  open,
  onOpenChange,
}: SubmissionShareLinksDialogProps) {
  const [expiryMinutes, setExpiryMinutes] = useState(DEFAULT_EXPIRY_MINUTES);
  // Keyed by type: generating one link must never discard another.
  const [links, setLinks] = useState<
    Partial<Record<SubmissionAccessLinkType, SubmissionAccessLinkToken>>
  >({});
  const [pendingType, setPendingType] =
    useState<SubmissionAccessLinkType | null>(null);
  const [, startTransition] = useTransition();
  const [canNativeShare, setCanNativeShare] = useState(false);

  // navigator.share only exists on some browsers, so it is read after mount to
  // keep the server and first client render identical.
  useEffect(() => {
    setCanNativeShare(typeof globalThis.navigator?.share === "function");
  }, []);

  const handleGenerate = (option: ShareLinkOption) => {
    setPendingType(option.type);

    startTransition(async () => {
      const result = await createSubmissionAccessLinkAction(
        formId,
        submissionId,
        option.type,
        expiryMinutes,
      );

      setPendingType(null);

      if (Result.isError(result)) {
        toast.error({ title: result.message });
        return;
      }

      setLinks((current) => ({ ...current, [option.type]: result.value }));

      // Copying is the near-certain next step, but the click that authorised it
      // may no longer count as recent after the awaited call above - so this is
      // best effort, and the copy button beside the link stays regardless.
      const copied = await copyValueToClipboard(
        getPublicUrl(`${option.path}/${formId}`, result.value.token),
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
      // Dismissing the sheet rejects; that is not a failure worth reporting.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] gap-3 overflow-y-auto sm:max-w-2xl"
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
          <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="share-link-expiry" className="text-sm font-medium">
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
            const isPending = pendingType === option.type;

            if (!generated) {
              const Icon = option.icon;

              return (
                <section
                  key={option.type}
                  className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:size-4">
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">{option.label}</h3>
                    <p className="text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
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
            );

            return (
              <ShareLinkRow
                key={option.type}
                icon={option.icon}
                title={option.label}
                description={option.description}
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
            Anyone with a link can use it until it expires. Regenerating issues a
            new link; the previous one keeps working until its own expiry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
