import { expect, test } from "@playwright/test";
import { EndatixApi } from "@/lib/endatix-api";
import { ClientIpEnv } from "@/lib/hosting/trusted-proxies";

// Every API-driven spec signs in through EndatixApi. This needs no app or
// browser: it fails when EndatixApi can't load under Playwright's module
// loader (endatix-hub#1323), or when it reaches for the Hub's request headers
// outside the Hub server, which registers the visitor-IP lookup at startup.
const TRUSTED_PROXIES = ClientIpEnv.TRUSTED_PROXIES;

test.describe("EndatixApi under the e2e loader", () => {
  let previousTrusted: string | undefined;
  let previousFetch: typeof fetch;

  test.beforeEach(() => {
    previousTrusted = process.env[TRUSTED_PROXIES];
    previousFetch = globalThis.fetch;
  });

  test.afterEach(() => {
    globalThis.fetch = previousFetch;
    if (previousTrusted === undefined) {
      delete process.env[TRUSTED_PROXIES];
    } else {
      process.env[TRUSTED_PROXIES] = previousTrusted;
    }
  });

  test("sends no visitor IP outside the Hub server with a trusted list set", async () => {
    // Arrange
    process.env[TRUSTED_PROXIES] = "10.0.0.0/8";
    const sent: Headers[] = [];
    globalThis.fetch = async (_input, init) => {
      sent.push(new Headers(init?.headers));
      return Response.json({});
    };
    const api = new EndatixApi(undefined, { baseUrl: "http://api.test" });

    // Act
    await api.request("/forms", { requireAuth: false });

    // Assert
    expect(sent).toHaveLength(1);
    expect(sent[0].has("X-Forwarded-For")).toBe(false);
  });
});
