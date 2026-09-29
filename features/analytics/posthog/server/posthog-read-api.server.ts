import "server-only";

/**
 * Read-only access to PostHog's private API (persons + HogQL), for admin screens that
 * show what PostHog recorded about someone. Needs a personal API key scoped to
 * `person:read` and `query:read`; the project token (`phc_…`) cannot read.
 *
 * Every call is best effort: missing config, a timeout or a non-2xx answer returns
 * `null`, and callers render nothing rather than an error.
 */

const REQUEST_TIMEOUT_MS = 5000;

export interface PostHogReadApiConfig {
  /** The app host (e.g. `https://us.posthog.com`), not the ingestion host. */
  host: string;
  projectId: string;
  apiKey: string;
}

export interface PostHogPerson {
  uuid: string;
  createdAt: string | null;
  properties: Readonly<Record<string, unknown>>;
}

export interface PostHogEvent {
  event: string;
  timestamp: string;
  pathname: string | null;
}

export function readPostHogReadApiConfig(): PostHogReadApiConfig | null {
  const host = process.env.POSTHOG_UI_HOST?.trim().replace(/\/$/, "");
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  return host && projectId && apiKey ? { host, projectId, apiKey } : null;
}

/** The PostHog UI page for a person, addressed by a distinct id or the person's uuid. */
export function postHogPersonUrl(
  config: Pick<PostHogReadApiConfig, "host" | "projectId">,
  distinctIdOrUuid: string,
): string {
  return `${config.host}/project/${encodeURIComponent(config.projectId)}/persons/${encodeURIComponent(distinctIdOrUuid)}`;
}

export async function getPostHogPersonByDistinctId(
  config: PostHogReadApiConfig,
  distinctId: string,
): Promise<PostHogPerson | null> {
  const body = await request<{
    results?: {
      uuid?: string;
      created_at?: string;
      properties?: Record<string, unknown>;
    }[];
  }>(config, `/persons/?distinct_id=${encodeURIComponent(distinctId)}`);
  const person = body?.results?.[0];
  if (!person?.uuid) {
    return null;
  }

  return {
    uuid: person.uuid,
    createdAt: person.created_at ?? null,
    properties: person.properties ?? {},
  };
}

export async function getPostHogPersonByUuid(
  config: PostHogReadApiConfig,
  personUuid: string,
): Promise<PostHogPerson | null> {
  const person = await request<{
    uuid?: string;
    created_at?: string;
    properties?: Record<string, unknown>;
  }>(config, `/persons/${encodeURIComponent(personUuid)}/`);
  if (!person?.uuid) {
    return null;
  }

  return {
    uuid: person.uuid,
    createdAt: person.created_at ?? null,
    properties: person.properties ?? {},
  };
}

/** The person behind any event in a session; `null` when PostHog has none. */
export async function findPostHogPersonUuidBySessionId(
  config: PostHogReadApiConfig,
  sessionId: string,
): Promise<string | null> {
  const body = await request<{ results?: unknown[][] }>(config, "/query/", {
    method: "POST",
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query:
          "select toString(person_id) from events where `$session_id` = {sessionId} limit 1",
        values: { sessionId },
      },
    }),
  });
  const uuid = body?.results?.[0]?.[0];
  return typeof uuid === "string" && uuid ? uuid : null;
}

/**
 * A person's events, newest first. `$pageview` plus every custom (non-`$`) event;
 * PostHog's own bookkeeping (`$set`, `$autocapture`, `$web_vitals`, …) is left out.
 */
export async function listPostHogPersonEvents(
  config: PostHogReadApiConfig,
  personUuid: string,
  limit: number,
): Promise<PostHogEvent[] | null> {
  const body = await request<{ results?: unknown[][] }>(config, "/query/", {
    method: "POST",
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: `select event, timestamp, properties.$pathname
                from events
                where person_id = toUUID({personId})
                  and (event = '$pageview' or not startsWith(event, '$'))
                  and timestamp > now() - interval 90 day
                order by timestamp desc
                limit ${Math.max(1, Math.min(limit, 100))}`,
        values: { personId: personUuid },
      },
    }),
  });
  if (!body?.results) {
    return null;
  }

  return body.results.flatMap((row) => {
    const [event, timestamp, pathname] = row;
    return typeof event === "string" && typeof timestamp === "string"
      ? [
          {
            event,
            timestamp,
            pathname: typeof pathname === "string" ? pathname : null,
          },
        ]
      : [];
  });
}

async function request<T>(
  config: PostHogReadApiConfig,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const response = await fetch(
      `${config.host}/api/projects/${encodeURIComponent(config.projectId)}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}
