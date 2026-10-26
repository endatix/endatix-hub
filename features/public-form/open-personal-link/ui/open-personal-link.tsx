"use client";

import {
  PublicStatusPage,
  publicStatusClassNames,
} from "@/components/public-status/public-status-page";
import SubmissionAlreadyCompleted from "@/features/public-form/ui/submission-already-completed";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { ErrorType, Result } from "@/lib/result";
import { Link2Off, LoaderCircle, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { openPersonalLinkAction } from "../open-personal-link.action";

type OpenPersonalLinkProps = { formId: string; token: string };

type Phase = "opening" | "notFound" | "ended" | "unavailable";

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

  if (phase === "ended") {
    return <SubmissionAlreadyCompleted variant="share" />;
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

function failedPhase(failure: Result<void>): Phase {
  if (Result.isSuccess(failure)) return "opening";
  if (failure.errorCode === ERROR_CODE.SUBMISSION_ENDED) return "ended";
  return failure.errorType === ErrorType.ValidationError
    ? "notFound"
    : "unavailable";
}

function useOpenPersonalLink(formId: string, token: string) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("opening");
  const startedFor = useRef<string | null>(null);

  const open = useCallback(async () => {
    setPhase("opening");
    // A dropped connection or a redeployed Hub rejects the call; both may pass on a retry.
    const opened = await openPersonalLinkAction(formId, token).catch(() =>
      Result.error<void>("The link could not be opened."),
    );
    if (Result.isSuccess(opened)) {
      router.replace(`/share/${formId}` as Route);
      return;
    }
    setPhase(failedPhase(opened));
  }, [formId, token, router]);

  useEffect(() => {
    // Strict Mode mounts twice in development; each link is redeemed once per page load.
    const link = `${formId}/${token}`;
    if (startedFor.current === link) return;
    startedFor.current = link;
    void open();
  }, [formId, token, open]);

  return { phase, retry: open };
}
