"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Code, Link2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { ShareLinkRow } from "@/features/share-links/ui/share-link-row";
import { withBasePath } from "@/lib/hosting";

interface ShareDialogProps {
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sharePath = (formId: string): string => withBasePath(`/share/${formId}`);
const embedScriptPath = withBasePath("/embed/v1/embed.js");

const getShareUrl = (formId: string): string => {
  const path = sharePath(formId);
  if (globalThis.window !== undefined) {
    return `${globalThis.window.location.origin}${path}`;
  }
  return path;
};

const getEmbedCode = (formId: string): string => {
  if (globalThis.window !== undefined) {
    return `<script src="${globalThis.window.location.origin}${embedScriptPath}" data-form-id="${formId}"></script>`;
  }
  return ``;
};

export function ShareDialog({ formId, open, onOpenChange }: ShareDialogProps) {
  const shareUrl = getShareUrl(formId);
  const embedCode = getEmbedCode(formId);

  const handleTabChange = (value: string) => {
    if (value === "embed-code" && !embedCode) {
      toast.error({
        title: "Unable to generate embed code. Please contact support.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Form</DialogTitle>
          <DialogDescription>
            Share the form with others via a direct link or embedded on a web
            page.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="share-link"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share-link">
              <Link2 data-icon="inline-start" />
              Share link
            </TabsTrigger>
            <TabsTrigger value="embed-code">
              <Code data-icon="inline-start" />
              Embed code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share-link" className="min-h-[280px]">
            <div className="flex flex-col gap-4 pt-4">
              <ShareLinkRow
                icon={Link2}
                title="Public share link"
                description="Send this link to respondents so they can submit the form."
                value={shareUrl}
                copyLabel="Copy share URL"
              />
            </div>
          </TabsContent>

          <TabsContent value="embed-code" className="min-h-[280px] pt-4">
            <section className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Code />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    Embed code
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Copy and paste this code into a web page to embed the form.
                  </p>
                </div>
              </div>
              <div className="relative">
                <Textarea
                  readOnly
                  value={embedCode}
                  className="bg-surface-container-lowest pr-10 font-mono text-xs"
                  rows={12}
                />
                <CopyToClipboard
                  copyValue={embedCode}
                  label="Copy embed code"
                  className="top-3 right-3 -translate-y-0"
                />
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
