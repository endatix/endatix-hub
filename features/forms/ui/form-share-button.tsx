"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "./share-dialog";

/** Share with its dialog, for pages that show a form without its settings. */
export function FormShareButton({ formId }: Readonly<{ formId: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Share2 />
        Share
      </Button>
      <ShareDialog formId={formId} open={open} onOpenChange={setOpen} />
    </>
  );
}
