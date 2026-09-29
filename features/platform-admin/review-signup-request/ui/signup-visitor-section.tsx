"use client";

import { Check, Globe } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { TextLink } from "@/components/common/text-link";
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/timeline";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactDateTime, formatPreciseDateTime } from "@/lib/date-utils";
import { getSignupVisitorAction } from "../review-signup-request.actions";
import type {
  SignupVisitor,
  SignupVisitorLookup,
  SignupVisitorRef,
} from "../types";

// Switching to the approve/reject step unmounts this section; coming back, or
// reopening the same request, must not ask PostHog again.
const CACHE_TTL_MS = 5 * 60 * 1000;
const lookups = new Map<
  string,
  { at: number; promise: Promise<SignupVisitorLookup> }
>();

function loadVisitor(ref: SignupVisitorRef): Promise<SignupVisitorLookup> {
  const key = visitorKey(ref);
  const cached = lookups.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = getSignupVisitorAction(ref).catch((): SignupVisitorLookup => {
    lookups.delete(key);
    return { status: "unavailable", profileHref: null };
  });
  lookups.set(key, { at: Date.now(), promise });
  return promise;
}

export function visitorKey(ref: SignupVisitorRef): string {
  return ref.distinctId
    ? `distinct:${ref.distinctId}`
    : `session:${ref.sessionId}`;
}

/** Test seam: forget cached lookups. */
export function clearSignupVisitorCache(): void {
  lookups.clear();
}

interface SignupVisitorSectionProps {
  visitor: SignupVisitorRef;
}

/**
 * What PostHog recorded about the person who submitted the request. The lookup
 * starts after paint, so the rest of the review sheet stays usable
 * (`DESIGN.md` §6 Evidence). A server action must not run during render:
 * Next would update the router while this component is rendering.
 */
export function SignupVisitorSection({
  visitor,
}: Readonly<SignupVisitorSectionProps>) {
  const [result, setResult] = useState<SignupVisitorLookup | null>(null);
  const { distinctId, sessionId } = visitor;

  useEffect(() => {
    let ignore = false;
    loadVisitor({ distinctId, sessionId }).then((lookup) => {
      if (!ignore) {
        setResult(lookup);
      }
    });
    return () => {
      ignore = true;
    };
  }, [distinctId, sessionId]);

  if (!result) {
    return (
      <VisitorFrame>
        <VisitorSkeleton />
      </VisitorFrame>
    );
  }

  // Not configured, and nothing to link to: no section (§5 Links).
  if (result.status === "unavailable" && !result.profileHref) {
    return null;
  }

  const profileHref =
    result.status === "found" ? result.visitor.profileHref : result.profileHref;

  return (
    <VisitorFrame profileHref={profileHref}>
      {result.status === "found" && <VisitorDetails visitor={result.visitor} />}
      {result.status === "missing" && (
        <p className="text-sm text-muted-foreground">
          PostHog has no activity for this visitor yet. Events can take a few
          minutes to arrive.
        </p>
      )}
      {result.status === "unavailable" && (
        <p className="text-sm text-muted-foreground">
          PostHog did not answer. Open the person in PostHog to see their
          activity.
        </p>
      )}
    </VisitorFrame>
  );
}

function VisitorFrame({
  profileHref = null,
  children,
}: Readonly<{ profileHref?: string | null; children: ReactNode }>) {
  return (
    <PanelSection
      icon={Globe}
      title="Visitor"
      description="What PostHog recorded on the device that sent this request."
      aside={
        profileHref ? (
          <TextLink href={profileHref} external className="text-sm">
            PostHog
          </TextLink>
        ) : undefined
      }
    >
      {children}
    </PanelSection>
  );
}

function VisitorDetails({ visitor }: Readonly<{ visitor: SignupVisitor }>) {
  return (
    <>
      <dl className="grid gap-3">
        <SummaryRow
          label="Location"
          value={orNotSet(
            visitor.location &&
              (visitor.timeZone
                ? `${visitor.location} (${visitor.timeZone})`
                : visitor.location),
          )}
        />
        <SummaryRow
          label="Browser"
          value={orNotSet(
            [visitor.browser, visitor.os && `on ${visitor.os}`]
              .filter(Boolean)
              .join(" ") || null,
          )}
        />
        <SummaryRow label="Device" value={orNotSet(visitor.device)} />
        <SummaryRow
          label="First came from"
          value={orNotSet(visitor.cameFrom)}
        />
        {visitor.campaign && (
          <SummaryRow label="Campaign" value={visitor.campaign} />
        )}
        <SummaryRow
          label="First page"
          value={orNotSet(
            visitor.landingPage && (
              <span className="font-mono text-xs break-all">
                {visitor.landingPage}
              </span>
            ),
          )}
        />
        <SummaryRow
          label="First seen"
          value={orNotSet(
            visitor.firstSeenAt && formatPreciseDateTime(visitor.firstSeenAt),
          )}
        />
      </dl>

      <div className="grid gap-2">
        <h4 className="text-sm text-muted-foreground">Recent activity</h4>
        {visitor.timeline === null && (
          <p className="text-sm text-muted-foreground">
            PostHog did not return the activity. Open the person in PostHog to
            see it.
          </p>
        )}
        {visitor.timeline?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No page views recorded in the last 90 days.
          </p>
        )}
        {visitor.timeline && visitor.timeline.length > 0 && (
          <VisitorTimeline steps={visitor.timeline} />
        )}
      </div>
    </>
  );
}

/**
 * Oldest first. The request is the active step, so the path that led to it reads
 * as completed (primary) and anything after it stays muted.
 */
function VisitorTimeline({
  steps,
}: Readonly<{ steps: NonNullable<SignupVisitor["timeline"]> }>) {
  const requestIndex = steps.findIndex((step) => step.kind === "signup");
  return (
    <Timeline
      size="sm"
      value={requestIndex >= 0 ? requestIndex + 1 : steps.length}
      aria-label="Visitor activity recorded by PostHog"
    >
      {steps.map((step, index) => (
        <TimelineItem key={`${step.timestamp}-${index}`} step={index + 1}>
          <TimelineHeader>
            <TimelineDate dateTime={step.timestamp}>
              {formatCompactDateTime(step.timestamp)}
            </TimelineDate>
            <TimelineTitle
              className={step.kind === "signup" ? undefined : "font-normal"}
            >
              {step.label}
              {step.count > 1 && (
                <span className="text-muted-foreground"> ×{step.count}</span>
              )}
            </TimelineTitle>
          </TimelineHeader>
          <TimelineIndicator>
            {step.kind === "signup" && <Check strokeWidth={3} />}
          </TimelineIndicator>
          <TimelineSeparator />
        </TimelineItem>
      ))}
    </Timeline>
  );
}

function VisitorSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">Loading visitor details from PostHog</span>
      {["w-32", "w-40", "w-24", "w-36"].map((width) => (
        <div key={width} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className={`h-4 ${width}`} />
        </div>
      ))}
    </div>
  );
}

function orNotSet(value: React.ReactNode) {
  return (
    value || (
      <span className="font-normal text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not recorded</span>
      </span>
    )
  );
}
