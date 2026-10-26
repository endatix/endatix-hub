"use client";

import {
  PublicStatusPage,
  publicStatusClassNames,
} from "@/components/public-status/public-status-page";
import SubmissionAlreadyCompleted from "@/features/public-form/ui/submission-already-completed";
import { TelemetryLogger } from "@/features/telemetry";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { ErrorType, Result } from "@/lib/result";
import {
  Link2Off,
  LoaderCircle,
  type LucideProps,
  TriangleAlert,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { openPersonalLinkAction } from "../open-personal-link.action";
import styles from "./open-personal-link.module.css";

type OpenPersonalLinkProps = { formId: string; token: string };

type Phase = "opening" | "notFound" | "ended" | "unavailable";

const TITLES: Record<Phase, string> = {
  opening: "Opening your survey…",
  notFound: "This link is not valid.",
  ended: "Thank you. This form has already been completed.",
  unavailable: "The link could not be opened.",
};

/** The loader turns while the link opens (reduced motion: it stays still). */
const SpinningLoaderCircle = forwardRef<SVGSVGElement, LucideProps>(
  function SpinningLoaderCircle({ className, ...props }, ref) {
    return (
      <LoaderCircle
        className={`${className ?? ""} ${styles.spin}`}
        ref={ref}
        {...props}
      />
    );
  },
);

/**
 * The personalized link's page. It redeems by POST after it mounts, never while it renders, so a
 * mail scanner or link preview that only fetches the page leaves the link unopened
 * (endatix-hub#1211). One polite live region announces each state, so a screen reader hears
 * the change the status page makes.
 */
export function OpenPersonalLink({
  formId,
  token,
}: Readonly<OpenPersonalLinkProps>) {
  const { phase, retry } = useOpenPersonalLink(formId, token);

  return (
    <>
      <PhasePage phase={phase} retry={retry} />
      <p aria-live="polite" className={styles.visuallyHidden} role="status">
        {TITLES[phase]}
      </p>
    </>
  );
}

function PhasePage({
  phase,
  retry,
}: Readonly<{ phase: Phase; retry: () => void }>) {
  if (phase === "notFound") {
    return (
      <PublicStatusPage
        icon={Link2Off}
        layout="page"
        message="Check that you used the whole link from your invitation."
        title={TITLES.notFound}
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
        title={TITLES.unavailable}
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
      icon={SpinningLoaderCircle}
      layout="page"
      title={TITLES.opening}
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
  const reloadOnRetry = useRef(false);

  const open = useCallback(async () => {
    setPhase("opening");
    // A dropped connection or a redeployed Hub rejects the call. After a redeploy this page's
    // action id is stale, so calling it again fails again: the retry reloads the page instead.
    const opened = await openPersonalLinkAction(formId, token).catch(
      (error) => {
        TelemetryLogger.error(
          "Failed to open a personalized link.",
          error,
          { formId },
          "public-form.open-personal-link",
        );
        reloadOnRetry.current = true;
        return Result.error<void>("The link could not be opened.");
      },
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

  const retry = useCallback(() => {
    if (reloadOnRetry.current) {
      window.location.reload();
      return;
    }
    void open();
  }, [open]);

  return { phase, retry };
}
