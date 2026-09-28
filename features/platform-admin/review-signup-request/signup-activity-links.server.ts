import "server-only";

import type {
  SignupActivityLinks,
  SignupRequestListItem,
} from "@/lib/endatix-api/signup-requests/types";

/**
 * Absolute PostHog links for a stored signup. Omitted unless the UI host, project id,
 * and at least one stored id are all present. Project id stays server-only.
 */
export function signupActivityLinks(
  item: Pick<SignupRequestListItem, "metadata">,
): SignupActivityLinks | null {
  const uiHost = process.env.POSTHOG_UI_HOST?.replace(/\/$/, "");
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!uiHost || !projectId) {
    return null;
  }

  const ids = readPostHogIds(item.metadata);
  const sessionId = ids.sessionId;
  const distinctId = ids.distinctId;
  const sessionHref = sessionId
    ? `${uiHost}/project/${encodeURIComponent(projectId)}/replay/${encodeURIComponent(sessionId)}`
    : undefined;
  const profileHref = distinctId
    ? `${uiHost}/project/${encodeURIComponent(projectId)}/persons/${encodeURIComponent(distinctId)}`
    : undefined;

  if (!sessionHref && !profileHref) {
    return null;
  }

  return { sessionHref, profileHref };
}

function readPostHogIds(metadata: string | null | undefined): {
  distinctId?: string;
  sessionId?: string;
} {
  if (!metadata) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadata) as {
      postHogDistinctId?: unknown;
      postHogSessionId?: unknown;
    };
    return {
      distinctId:
        typeof parsed.postHogDistinctId === "string"
          ? parsed.postHogDistinctId
          : undefined,
      sessionId:
        typeof parsed.postHogSessionId === "string"
          ? parsed.postHogSessionId
          : undefined,
    };
  } catch {
    return {};
  }
}
