"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The id someone quotes when reporting a failed export. It resolves to the
 * trace carrying the `render-pdf` span, so support can see what the render was
 * actually doing.
 */
export function SupportReferenceLine({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the id is on screen to copy by hand.
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
      <span>Reference</span>
      <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all">
        {reference}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copy}
        aria-label="Copy reference"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
