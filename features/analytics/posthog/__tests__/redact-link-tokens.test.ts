import type { CaptureResult } from "posthog-js";
import { describe, expect, it, vi } from "vitest";
import {
  redactLinkTokens,
  redactLinkTokensInEvent,
  redactStoredLinkTokens,
} from "../client/redact-link-tokens";

describe("redactLinkTokens", () => {
  it.each([
    [
      "https://hub.example.com/share/42/a/abc-DEF_123",
      "https://hub.example.com/share/42/a/[redacted]",
    ],
    [
      "https://hub.example.com/hub/share/42/a/abc123?lang=en#top",
      "https://hub.example.com/hub/share/42/a/[redacted]?lang=en#top",
    ],
    ["/share/42/a/abc123", "/share/42/a/[redacted]"],
    [
      "https://hub.example.com/share/42?token=eyJhbGciOi.payload.sig",
      "https://hub.example.com/share/42",
    ],
    [
      "https://hub.example.com/share/42?token=eyJ.x.y&lang=en",
      "https://hub.example.com/share/42?lang=en",
    ],
    [
      "https://hub.example.com/share/42?lang=en&token=eyJ.x.y",
      "https://hub.example.com/share/42?lang=en",
    ],
    ["token=eyJ.x.y", ""],
    ["lang=en&token=eyJ.x.y&page=2", "lang=en&page=2"],
  ])("redacts %s", (value, expected) => {
    expect(redactLinkTokens(value)).toBe(expected);
  });

  it.each([
    "https://hub.example.com/forms/42/audience",
    "https://hub.example.com/share/42",
    "/share/42/about",
    "?lang=en&mytoken=keep",
  ])("leaves %s as it is", (value) => {
    expect(redactLinkTokens(value)).toBe(value);
  });
});

describe("redactLinkTokensInEvent", () => {
  it("redacts every URL-bearing property, person properties and recording data", () => {
    const link = "https://hub.example.com/share/42/a/secret-token";
    const event = {
      uuid: "u1",
      event: "$pageview",
      properties: {
        $current_url: link,
        $pathname: "/share/42/a/secret-token",
        $referrer: "https://hub.example.com/share/42?token=jwt.secret",
        url: link,
        search: "token=jwt.secret",
        $snapshot_data: [
          { type: 4, data: { href: link } },
          { type: 6, data: { payload: { requests: [{ name: link }] } } },
        ],
        $elements_count: 2,
      },
      $set_once: {
        $initial_current_url: link,
        $initial_pathname: "/share/42/a/secret-token",
      },
      $set: { $current_url: link },
      timestamp: new Date(0),
    } as unknown as CaptureResult;

    const sent = JSON.stringify(redactLinkTokensInEvent(event));

    expect(sent).not.toContain("secret");
    expect(sent).toContain("/share/42/a/[redacted]");
    expect(sent).toContain('"$elements_count":2');
  });

  it("passes a dropped event through", () => {
    expect(redactLinkTokensInEvent(null)).toBeNull();
  });
});

describe("redactStoredLinkTokens", () => {
  it("rewrites the stored URL properties posthog-js sends with feature flag calls", () => {
    const stored: Record<string, unknown> = {
      $initial_person_info: {
        r: "$direct",
        u: "https://hub.example.com/share/42?token=jwt.secret",
      },
      $client_session_props: {
        sessionId: "s1",
        props: { u: "https://hub.example.com/share/42/a/secret-token" },
      },
    };
    const posthog = {
      get_property: (key: string) => stored[key],
      register: (props: Record<string, unknown>) =>
        Object.assign(stored, props),
    };

    redactStoredLinkTokens(posthog);

    expect(JSON.stringify(stored)).not.toContain("secret");
    expect(stored.$initial_person_info).toEqual({
      r: "$direct",
      u: "https://hub.example.com/share/42",
    });
  });

  it("writes nothing when no stored URL carries a token", () => {
    const register = vi.fn();
    redactStoredLinkTokens({
      get_property: () => ({ u: "https://hub.example.com/forms/42" }),
      register,
    });

    expect(register).not.toHaveBeenCalled();
  });
});
