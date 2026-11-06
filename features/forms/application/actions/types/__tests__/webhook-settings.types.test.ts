import { describe, expect, it } from "vitest";
import { EVENT_KEYS, WebhookSettingsSchema } from "../webhook-settings.types";

describe("WebhookSettingsSchema", () => {
  it("lists Submission Closed under its new key and drops the retired one", () => {
    // Act & Assert
    expect(EVENT_KEYS).toContain("SubmissionClosed");
    expect(EVENT_KEYS).not.toContain("SubmissionCollectionStatusChanged");
  });

  it("keeps the Submission Closed enabled flag and URL", () => {
    // Arrange
    const input = {
      formId: "1",
      useCustomSettings: true,
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "https://example.com/closed",
    };

    // Act
    const result = WebhookSettingsSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "https://example.com/closed",
    });
  });

  it("requires a URL when Submission Closed is enabled", () => {
    // Arrange
    const input = {
      formId: "1",
      useCustomSettings: true,
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "",
    };

    // Act
    const result = WebhookSettingsSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["event-SubmissionClosed-url"],
      message: "URL is required for enabled events",
    });
  });
});
