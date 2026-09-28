"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { publicStatusClassNames } from "./public-status-page";

/**
 * A copyable id the reader can quote to support — a trace id or an error digest.
 * The id stays on screen, so a blocked clipboard costs nothing.
 */
export function PublicStatusReference({
  reference,
}: Readonly<{ reference: string }>) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard blocked; the id is on screen to copy by hand.
    }
  };

  return (
    <div className={publicStatusClassNames.reference}>
      <span>Reference</span>
      <code className={publicStatusClassNames.referenceCode}>{reference}</code>
      <button
        aria-label="Copy reference"
        className={publicStatusClassNames.referenceButton}
        onClick={copy}
        type="button"
      >
        {isCopied ? (
          <Check aria-hidden size={14} />
        ) : (
          <Copy aria-hidden size={14} />
        )}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
