"use client";

import {
  PublicStatusPage,
  publicStatusClassNames,
} from "@/components/public-status/public-status-page";
import { ErrorType, Result } from "@/lib/result";
import { Link2Off, LoaderCircle, TriangleAlert } from "lucide-react";
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
        icon={TriangleAlert}
        layout="page"
        title="The link could not be opened."
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
    >
      <noscript>
        <p>Turn on JavaScript in your browser to open your survey.</p>
      </noscript>
    </PublicStatusPage>
  );
}

function useOpenPersonalLink(formId: string, token: string) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("opening");
  const startedFor = useRef<string | null>(null);
  const reloadOnRetry = useRef(false);

  const open = useCallback(async () => {
    setPhase("opening");
    // A dropped connection or a redeployed Hub rejects the call. After a redeploy this page's
    // action id is stale, so calling it again fails again: the retry reloads the page instead.
    const opened = await openPersonalLinkAction(formId, token).catch(() => {
      reloadOnRetry.current = true;
      return Result.error<void>("The link could not be opened.");
    });
    if (Result.isSuccess(opened)) {
      router.replace(`/share/${formId}` as Route);
      return;
    }
    const notValid = opened.errorType === ErrorType.ValidationError;
    setPhase(notValid ? "notFound" : "unavailable");
  }, [formId, token, router]);

  useEffect(() => {
    // Strict Mode mounts twice in development; each link is redeemed once per page load.
    const link = `${formId}/${token}`;
    if (startedFor.current === link) return;
    startedFor.current = link;
    void open();
  }, [formId, token, open]);

  const retry = useCallback(() => {
    if (reloadOnRetry.current) {
      window.location.reload();
      return;
    }
    void open();
  }, [open]);

  return { phase, retry };
}
