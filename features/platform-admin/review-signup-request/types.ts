import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";

/** Platform admin user id → display label, for "Decided by". */
export type SignupReviewers = Readonly<Record<string, string>>;

/**
 * The PostHog visitor behind a signup, as the public form stored it. At least one id
 * is present. The distinct id wins; the session id finds the person when the distinct
 * id was not stored. Neither is a secret: both appear in PostHog URLs.
 */
export interface SignupVisitorRef {
  distinctId: string | null;
  sessionId: string | null;
}

/**
 * What the queue and the review panel render: the API row without its opaque
 * `metadata` bag, plus the visitor reference the server read from it.
 */
export type SignupRequestView = Omit<SignupRequestListItem, "metadata"> & {
  /** Absent when the PostHog read API is not configured, or no id was stored. */
  visitor: SignupVisitorRef | null;
};

/** One step in what PostHog recorded, oldest first. */
export interface SignupVisitorEvent {
  kind: "pageview" | "signup" | "custom";
  /** What happened, in the reviewer's words ("Viewed /signup"). */
  label: string;
  timestamp: string;
  /** Consecutive identical steps fold into one. */
  count: number;
}

/**
 * The review-relevant slice of a PostHog person. Deliberately excludes IP, coordinates
 * and postal code (`DESIGN.md` §6 "Evidence from other tools").
 */
export interface SignupVisitor {
  profileHref: string;
  firstSeenAt: string | null;
  location: string | null;
  timeZone: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  cameFrom: string | null;
  campaign: string | null;
  landingPage: string | null;
  /** `null` when the events query failed; `[]` when PostHog has none. */
  timeline: SignupVisitorEvent[] | null;
}

export type SignupVisitorLookup =
  | { status: "found"; visitor: SignupVisitor }
  /** PostHog answered, but has no person for this id (yet). */
  | { status: "missing"; profileHref: string }
  /** Not configured, or PostHog did not answer. */
  | { status: "unavailable"; profileHref: string | null };
