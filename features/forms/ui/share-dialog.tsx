"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link2, Code } from "lucide-react";
import { toast } from "@/components/ui/toast";
import CopyToClipboard from "@/components/copy-to-clipboard";

interface ShareDialogProps {
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const getShareUrl = (formId: string): string => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${basePath}/share/${formId}`;
  }
  return `${basePath}/share/${formId}`;
};

const getEmbedCode = (formId: string): string => {
  if (typeof window !== "undefined") {
    return `<script src="${window.location.origin}${basePath}/embed/v1/embed.js" data-form-id="${formId}"></script>`;
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
              <Link2 className="mr-2 h-4 w-4" />
              Share link
            </TabsTrigger>
            <TabsTrigger value="embed-code">
              <Code className="mr-2 h-4 w-4" />
              Embed code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share-link" className="min-h-[280px] space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Send this link to users for submitting the form.
              </p>
              <div className="relative">
                <Input
                  id="share-url"
                  readOnly
                  value={shareUrl}
                  className="pr-10"
                />
                <CopyToClipboard copyValue={shareUrl} label="Copy share URL" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="embed-code" className="min-h-[280px] space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Copy and paste this code into a web page to embed the form.
              </p>
              <div className="relative">
                <Textarea
                  readOnly
                  value={embedCode}
                  className="pr-10 font-mono text-xs"
                  rows={12}
                />
                <CopyToClipboard
                  copyValue={embedCode}
                  label="Copy embed code"
                  className="top-3 right-3 -translate-y-0"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
