import { describe, expect, it } from "vitest";
import { EVENT_KEYS, WebhookSettingsSchema } from "../webhook-settings.types";

describe("WebhookSettingsSchema", () => {
  it("lists Submission closed under its new key and drops the retired one", () => {
    expect(EVENT_KEYS).toContain("SubmissionClosed");
    expect(EVENT_KEYS).not.toContain("SubmissionCollectionStatusChanged");
  });

  it("keeps the Submission closed enabled flag and URL", () => {
    const result = WebhookSettingsSchema.safeParse({
      formId: "1",
      useCustomSettings: true,
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "https://example.com/closed",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "https://example.com/closed",
    });
  });

  it("requires a URL when Submission closed is enabled", () => {
    const result = WebhookSettingsSchema.safeParse({
      formId: "1",
      useCustomSettings: true,
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["event-SubmissionClosed-url"],
      message: "URL is required for enabled events",
    });
  });
});
