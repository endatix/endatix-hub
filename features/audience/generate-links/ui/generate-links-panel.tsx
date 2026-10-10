"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { Result } from "@/lib/result";
import { generateAudienceLinksAction } from "../generate-audience-links.action";

type GenerateLinksPanelProps = { formId: string };

function linkUrl(formId: string, token: string): string {
  const origin = globalThis.location?.origin ?? "";
  return `${origin}/share/${formId}/a/${token}`;
}

export function GenerateLinksPanel({
  formId,
}: Readonly<GenerateLinksPanelProps>) {
  const [links, setLinks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function issue() {
    setPending(true);
    setError(null);
    const result = await generateAudienceLinksAction(formId);
    setPending(false);
    if (Result.isError(result)) {
      setError(result.message);
      return;
    }
    setLinks(result.value.map((link) => linkUrl(formId, link.token)));
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={issue}
      >
        <Link2 />
        Personalised links
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {links.length === 0 ? null : (
        <ul className="max-h-40 overflow-auto text-sm">
          {links.map((href) => (
            <li key={href} className="flex items-center gap-2">
              <span className="truncate">{href}</span>
              <CopyToClipboard
                copyValue={href}
                layout="inline"
                label={`Copy link ${href}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
