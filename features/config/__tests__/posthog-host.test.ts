import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSTHOG_HOST,
  resolvePostHogBrowserHost,
  resolvePostHogNodeHost,
} from "../client-endatix-config";

describe("resolvePostHogNodeHost", () => {
  it("keeps an absolute origin so a regional project is honoured", () => {
    expect(resolvePostHogNodeHost("https://eu.i.posthog.com")).toBe(
      "https://eu.i.posthog.com",
    );
  });

  // posthog-node issues real HTTP calls; Hub's rewrite only exists in the browser.
  it.each(["/ingest", "", "   ", "not a url", "ftp://posthog.example"])(
    "falls back to the default host for %j",
    (host) => {
      expect(resolvePostHogNodeHost(host)).toBe(DEFAULT_POSTHOG_HOST);
    },
  );
});

describe("resolvePostHogBrowserHost", () => {
  // The /ingest rewrite in next.config.ts points at the default host and nowhere else.
  it.each([DEFAULT_POSTHOG_HOST, ""])(
    "proxies through /ingest for %j",
    (host) => {
      expect(resolvePostHogBrowserHost(host)).toBe("/ingest");
    },
  );

  it("calls a non-default host directly so events keep their region", () => {
    expect(resolvePostHogBrowserHost("https://eu.i.posthog.com")).toBe(
      "https://eu.i.posthog.com",
    );
  });

  it("treats the default host with a trailing slash as /ingest", () => {
    expect(resolvePostHogBrowserHost(`${DEFAULT_POSTHOG_HOST}/`)).toBe(
      "/ingest",
    );
  });

  it("passes a custom proxy path through untouched", () => {
    expect(resolvePostHogBrowserHost("/telemetry")).toBe("/telemetry");
  });
});
