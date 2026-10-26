import type { CaptureResult } from "posthog-js";

/** The token segment of a personalized link, `/share/{formId}/a/{token}` (any base path). */
const LINK_TOKEN = /(\/share\/[^/?#\s"']+\/a\/)[^/?#\s"'&]+/g;
/** An access-token query parameter, `?token=<JWT>` on `/share/{formId}`. */
const TOKEN_PARAM = /(^|[?&])token=[^&#\s"']*/g;
const HAS_TOKEN_PARAM = /(^|[?&])token=/;

function dropTokenParam(value: string): string {
  if (!HAS_TOKEN_PARAM.test(value)) return value;
  return value
    .replace(TOKEN_PARAM, "$1")
    .replace(/\?&+/g, "?")
    .replace(/&&+/g, "&")
    .replace(/[?&](?=#|$|[\s"'])/g, "")
    .replace(/^&/, "");
}

/**
 * Removes the credentials a share URL can carry: the personalized link's token becomes
 * `[redacted]` and a `token` query parameter is dropped. Other text is left as it is.
 */
export function redactLinkTokens(value: string): string {
  return dropTokenParam(value.replace(LINK_TOKEN, "$1[redacted]"));
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactLinkTokens(value);
  if (Array.isArray(value)) return value.map((item) => redactDeep(item));
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeep(item)]),
    );
  }
  return value;
}

/**
 * PostHog `before_send`: every string in the event, which covers `$current_url`, `$pathname`,
 * `$referrer`, the `$initial_*` person properties, autocapture and the session recording's
 * `$snapshot_data` (posthog-js sends recordings through `capture` too).
 */
export function redactLinkTokensInEvent(
  event: CaptureResult | null,
): CaptureResult | null {
  return event ? (redactDeep(event) as CaptureResult) : event;
}
