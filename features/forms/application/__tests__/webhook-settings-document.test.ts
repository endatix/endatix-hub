import { describe, expect, it } from "vitest";
import {
  buildWebhookConfiguration,
  readFormWebhookEvents,
  readTenantWebhookEvents,
} from "../webhook-settings-document";

const RETIRED_KEY = "SubmissionCollectionStatusChanged";

describe("buildWebhookConfiguration", () => {
  it("saves Submission Closed under its new key with the enabled flag and URL", () => {
    // Arrange
    const posted = {
      formId: "1",
      useCustomSettings: true,
      "event-SubmissionClosed-enabled": true,
      "event-SubmissionClosed-url": "https://example.com/closed",
      "event-FormDeleted-enabled": false,
      "event-FormDeleted-url": "https://example.com/deleted",
    };

    // Act
    const config = buildWebhookConfiguration(posted);

    // Assert
    expect(config).toEqual({
      Events: {
        SubmissionClosed: {
          IsEnabled: true,
          WebHookEndpoints: [{ Url: "https://example.com/closed" }],
        },
      },
    });
  });
});

describe("readFormWebhookEvents", () => {
  it("shows a document saved under the retired key as Submission Closed", () => {
    // Arrange
    const stored = JSON.stringify({
      Events: {
        [RETIRED_KEY]: {
          IsEnabled: true,
          WebHookEndpoints: [{ Url: "https://example.com/old" }],
        },
      },
    });

    // Act
    const events = readFormWebhookEvents(stored);

    // Assert
    expect(events.SubmissionClosed).toEqual({
      enabled: true,
      url: "https://example.com/old",
    });
    expect(events).not.toHaveProperty(RETIRED_KEY);
  });

  it("prefers the new key when a document carries both", () => {
    // Arrange
    const stored = JSON.stringify({
      Events: {
        [RETIRED_KEY]: {
          IsEnabled: true,
          WebHookEndpoints: [{ Url: "https://example.com/old" }],
        },
        SubmissionClosed: {
          IsEnabled: true,
          WebHookEndpoints: [{ Url: "https://example.com/new" }],
        },
      },
    });

    // Act
    const events = readFormWebhookEvents(stored);

    // Assert
    expect(events.SubmissionClosed.url).toBe("https://example.com/new");
  });

  it("saves a reloaded retired-key document back under the new key only", () => {
    // Arrange
    const stored = JSON.stringify({
      Events: {
        [RETIRED_KEY]: {
          IsEnabled: true,
          WebHookEndpoints: [{ Url: "https://example.com/old" }],
        },
      },
    });

    // Act: reload the stored document, then save it as the form posts it
    const events = readFormWebhookEvents(stored);
    const saved = JSON.stringify(
      buildWebhookConfiguration({
        formId: "1",
        useCustomSettings: true,
        "event-SubmissionClosed-enabled": events.SubmissionClosed.enabled,
        "event-SubmissionClosed-url": events.SubmissionClosed.url,
      }),
    );

    // Assert
    expect(saved).not.toContain(RETIRED_KEY);
    expect(JSON.parse(saved).Events.SubmissionClosed.WebHookEndpoints).toEqual([
      { Url: "https://example.com/old" },
    ]);
  });

  it("reads every event as disabled when there is no document or it is not JSON", () => {
    // Act & Assert
    for (const json of [undefined, "not json"]) {
      expect(readFormWebhookEvents(json).SubmissionClosed).toEqual({
        enabled: false,
        url: "",
      });
    }
  });
});

describe("readTenantWebhookEvents", () => {
  it("shows tenant defaults saved under the retired key as Submission Closed", () => {
    // Arrange
    const settings = {
      events: {
        [RETIRED_KEY]: {
          isEnabled: true,
          webHookEndpoints: [{ url: "https://example.com/tenant" }],
        },
      },
    };

    // Act
    const events = readTenantWebhookEvents(settings);

    // Assert
    expect(events.SubmissionClosed).toEqual({
      enabled: true,
      url: "https://example.com/tenant",
    });
  });
});
