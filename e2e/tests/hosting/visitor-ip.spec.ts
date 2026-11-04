import { expect, test } from "@playwright/test";
import { readVisitorIp } from "@/lib/hosting/client-ip";

// Every API-driven spec signs in through EndatixApi, which reads the visitor
// IP. This needs no app or browser: it fails when that lookup can't load under
// Playwright's module loader (endatix-hub#1323). It names the variable itself:
// importing trusted-proxies here would load it before readVisitorIp does.
const TRUSTED_PROXIES = "ENDATIX_TRUSTED_PROXIES";

test.describe("Visitor IP under the e2e loader", () => {
  let previous: string | undefined;

  test.beforeEach(() => {
    previous = process.env[TRUSTED_PROXIES];
  });

  test.afterEach(() => {
    if (previous === undefined) {
      delete process.env[TRUSTED_PROXIES];
    } else {
      process.env[TRUSTED_PROXIES] = previous;
    }
  });

  test("reads no visitor IP outside a request with a trusted list set", async () => {
    // Arrange
    process.env[TRUSTED_PROXIES] = "10.0.0.0/8";

    // Act
    const visitorIp = await readVisitorIp();

    // Assert
    expect(visitorIp).toBeNull();
  });
});
