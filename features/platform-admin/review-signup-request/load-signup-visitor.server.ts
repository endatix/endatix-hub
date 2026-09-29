import "server-only";

import {
  findPostHogPersonUuidBySessionId,
  getPostHogPersonByDistinctId,
  getPostHogPersonByUuid,
  listPostHogPersonEvents,
  postHogPersonUrl,
  readPostHogReadApiConfig,
  type PostHogEvent,
} from "@/features/analytics/posthog/server/posthog-read-api.server";
import type {
  SignupVisitorEvent,
  SignupVisitorLookup,
  SignupVisitorRef,
} from "./types";

const EVENTS_TO_READ = 50;
const TIMELINE_STEPS = 15;
const SIGNUP_EVENT = "signup_requested";

export async function loadSignupVisitor(
  ref: SignupVisitorRef,
): Promise<SignupVisitorLookup> {
  const config = readPostHogReadApiConfig();
  if (!config) {
    return { status: "unavailable", profileHref: null };
  }

  let person = ref.distinctId
    ? await getPostHogPersonByDistinctId(config, ref.distinctId)
    : null;
  if (!person && ref.sessionId) {
    const uuid = await findPostHogPersonUuidBySessionId(config, ref.sessionId);
    person = uuid ? await getPostHogPersonByUuid(config, uuid) : null;
  }

  if (!person) {
    // Without a distinct id there is no person URL to fall back to.
    return ref.distinctId
      ? {
          status: "missing",
          profileHref: postHogPersonUrl(config, ref.distinctId),
        }
      : { status: "unavailable", profileHref: null };
  }

  const profileHref = postHogPersonUrl(config, ref.distinctId ?? person.uuid);
  const events = await listPostHogPersonEvents(
    config,
    person.uuid,
    EVENTS_TO_READ,
  );
  const props = person.properties;

  return {
    status: "found",
    visitor: {
      profileHref,
      firstSeenAt: person.createdAt,
      location: joinPresent(
        [latest(props, "geoip_city_name"), latest(props, "geoip_country_name")],
        ", ",
      ),
      timeZone: latest(props, "geoip_time_zone"),
      browser: joinPresent(
        [latest(props, "browser"), latest(props, "browser_version")],
        " ",
      ),
      os: joinPresent([latest(props, "os"), latest(props, "os_version")], " "),
      device: latest(props, "device_type"),
      cameFrom: describeReferrer(text(props, "$initial_referring_domain")),
      campaign: joinPresent(
        [
          text(props, "$initial_utm_source"),
          text(props, "$initial_utm_medium"),
          text(props, "$initial_utm_campaign"),
        ],
        " / ",
      ),
      landingPage: text(props, "$initial_pathname"),
      timeline: events ? toTimeline(events) : null,
    },
  };
}

/** Oldest first, repeats folded, ending at the most recent steps. */
export function toTimeline(
  eventsNewestFirst: PostHogEvent[],
): SignupVisitorEvent[] {
  const steps: SignupVisitorEvent[] = [];
  for (const event of [...eventsNewestFirst].reverse()) {
    const step = toStep(event);
    const previous = steps.at(-1);
    if (previous && previous.label === step.label) {
      previous.count += 1;
      continue;
    }

    steps.push(step);
  }

  return steps.slice(-TIMELINE_STEPS);
}

function toStep(event: PostHogEvent): SignupVisitorEvent {
  if (event.event === SIGNUP_EVENT) {
    return {
      kind: "signup",
      label: "Requested a workspace",
      timestamp: event.timestamp,
      count: 1,
    };
  }

  if (event.event === "$pageview") {
    return {
      kind: "pageview",
      label: `Viewed ${event.pathname ?? "a page"}`,
      timestamp: event.timestamp,
      count: 1,
    };
  }

  const words = event.event.replace(/[_-]+/g, " ").trim();
  return {
    kind: "custom",
    label: words.charAt(0).toUpperCase() + words.slice(1),
    timestamp: event.timestamp,
    count: 1,
  };
}

function describeReferrer(domain: string | null): string | null {
  if (!domain) {
    return null;
  }

  return domain === "$direct" ? "Direct visit (no referrer)" : domain;
}

/** The current value, falling back to the first-visit (`$initial_`) one. */
function latest(props: Readonly<Record<string, unknown>>, key: string) {
  return text(props, `$${key}`) ?? text(props, `$initial_${key}`);
}

function text(
  props: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = props[key];
  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function joinPresent(parts: (string | null)[], separator: string) {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(separator) : null;
}
