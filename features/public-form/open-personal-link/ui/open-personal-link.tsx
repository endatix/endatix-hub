"use client";

import {
  PublicStatusPage,
  publicStatusClassNames,
} from "@/components/public-status/public-status-page";
import { CircleAlert, Link2Off, LoaderCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { openPersonalLinkAction } from "../open-personal-link.action";

type OpenPersonalLinkProps = { formId: string; token: string };

type Phase = "opening" | "notFound" | "unavailable";

/**
 * The personalized link's page. It redeems by POST after it mounts, never while it renders, so a
 * mail scanner or link preview that only fetches the page leaves the link unopened
 * (endatix-hub#1211).
 */
export function OpenPersonalLink({
  formId,
  token,
}: Readonly<OpenPersonalLinkProps>) {
  const { phase, retry } = useOpenPersonalLink(formId, token);

  if (phase === "notFound") {
    return (
      <PublicStatusPage
        icon={Link2Off}
        layout="page"
        message="Check that you used the whole link from your invitation."
        title="This link is not valid."
        tone="neutral"
      />
    );
  }

  if (phase === "unavailable") {
    return (
      <PublicStatusPage
        icon={CircleAlert}
        layout="page"
        title="The link could not be opened. Try again."
        tone="warning"
      >
        <button
          className={publicStatusClassNames.action}
          onClick={retry}
          type="button"
        >
          Try again
        </button>
      </PublicStatusPage>
    );
  }

  return (
    <PublicStatusPage
      icon={LoaderCircle}
      layout="page"
      title="Opening your survey…"
      tone="neutral"
    />
  );
}

function useOpenPersonalLink(formId: string, token: string) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("opening");
  const started = useRef(false);

  const open = useCallback(async () => {
    setPhase("opening");
    const opened = await openPersonalLinkAction(formId, token);
    if (opened.kind === "opened") {
      router.replace(`/share/${formId}` as Route);
      return;
    }
    setPhase(opened.kind);
  }, [formId, token, router]);

  useEffect(() => {
    // Strict Mode mounts twice in development; the link is redeemed once per page load.
    if (started.current) return;
    started.current = true;
    void open();
  }, [open]);

  return { phase, retry: open };
}
