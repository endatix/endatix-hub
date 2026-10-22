import { afterEach, describe, expect, it, vi } from "vitest";
import { getReCaptchaToken } from "../recaptcha-client";

vi.mock("../../recaptcha-config", () => ({
  recaptchaConfig: {
    SITE_KEY: "site-key",
    JS_URL: "https://recaptcha.test/api.js",
  },
}));

function stubGrecaptcha(execute: () => Promise<string>) {
  vi.stubGlobal("grecaptcha", {
    ready: (callback: () => void) => callback(),
    execute,
  });
}

describe("getReCaptchaToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the token reCAPTCHA returns", async () => {
    stubGrecaptcha(() => Promise.resolve("token-123"));

    await expect(getReCaptchaToken("submit_form")).resolves.toBe("token-123");
  });

  it("rejects when reCAPTCHA fails instead of hanging", async () => {
    stubGrecaptcha(() => Promise.reject(new Error("reCAPTCHA unavailable")));

    await expect(getReCaptchaToken("submit_form")).rejects.toThrow(
      "reCAPTCHA unavailable",
    );
  });
});
