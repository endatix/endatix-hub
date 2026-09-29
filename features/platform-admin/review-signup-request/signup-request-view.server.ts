import "server-only";

import { readPostHogReadApiConfig } from "@/features/analytics/posthog/server/posthog-read-api.server";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import type { SignupRequestView, SignupVisitorRef } from "./types";

/**
 * The one place an API row becomes what the UI renders. The list loader and every
 * decision action go through it, so a decision never drops the visitor reference.
 */
export function toSignupRequestView(
  item: SignupRequestListItem,
): SignupRequestView {
  const { metadata, ...row } = item;
  return { ...row, visitor: readSignupVisitorRef(metadata) };
}

/**
 * The stored PostHog ids, when the read API is configured to look them up. A session
 * id alone is enough to find the person, but it is never used to link a replay: it
 * exists even when recording is off.
 */
export function readSignupVisitorRef(
  metadata: string | null | undefined,
): SignupVisitorRef | null {
  if (!readPostHogReadApiConfig() || !metadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as {
      postHogDistinctId?: unknown;
      postHogSessionId?: unknown;
    };
    const distinctId = nonEmpty(parsed.postHogDistinctId);
    const sessionId = nonEmpty(parsed.postHogSessionId);
    return distinctId || sessionId ? { distinctId, sessionId } : null;
  } catch {
    return null;
  }
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
