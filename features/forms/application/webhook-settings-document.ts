import type { WebHookConfiguration } from "@/types";
import type { WebHookSettings } from "@/lib/endatix-api/tenant";
import {
  EVENT_KEYS,
  type WebhookEventKey,
  type WebhookSettingsData,
} from "./actions/types/webhook-settings.types";

export type WebhookEventValue = { enabled: boolean; url: string };

export type WebhookEventValues = Record<WebhookEventKey, WebhookEventValue>;

/**
 * Keys the API retired, by the key that replaced them. A document saved before the
 * rename can still carry one; it reads as the new key and is never written back.
 */
const RETIRED_EVENT_KEYS: Partial<Record<WebhookEventKey, string>> = {
  SubmissionClosed: "SubmissionCollectionStatusChanged",
};

const DISABLED: WebhookEventValue = { enabled: false, url: "" };

function lookupEvent<T>(
  events: Record<string, T> | undefined,
  key: WebhookEventKey,
): T | undefined {
  const retiredKey = RETIRED_EVENT_KEYS[key];
  return events?.[key] ?? (retiredKey ? events?.[retiredKey] : undefined);
}

function readEvents(
  read: (key: WebhookEventKey) => WebhookEventValue | undefined,
): WebhookEventValues {
  return Object.fromEntries(
    EVENT_KEYS.map((key) => [key, read(key) ?? DISABLED]),
  ) as WebhookEventValues;
}

function parseConfiguration(
  settingsJson: string | null | undefined,
): WebHookConfiguration | undefined {
  if (!settingsJson) return undefined;
  try {
    return JSON.parse(settingsJson) as WebHookConfiguration;
  } catch {
    return undefined;
  }
}

/** Reads a form's stored webhook document (`webHookSettingsJson`). */
export function readFormWebhookEvents(
  settingsJson: string | null | undefined,
): WebhookEventValues {
  const events = parseConfiguration(settingsJson)?.Events;
  return readEvents((key) => {
    const config = lookupEvent(events, key);
    return config && {
      enabled: config.IsEnabled ?? false,
      url: config.WebHookEndpoints?.[0]?.Url ?? "",
    };
  });
}

/** Reads the tenant's default webhook settings. */
export function readTenantWebhookEvents(
  settings: WebHookSettings | null | undefined,
): WebhookEventValues {
  return readEvents((key) => {
    const config = lookupEvent(settings?.events, key);
    return config && {
      enabled: config.isEnabled ?? false,
      url: config.webHookEndpoints?.[0]?.url ?? "",
    };
  });
}

/** Builds the form's webhook document from the posted settings: enabled events only. */
export function buildWebhookConfiguration(
  data: WebhookSettingsData,
): WebHookConfiguration {
  const config: WebHookConfiguration = { Events: {} };

  for (const key of EVENT_KEYS) {
    const enabled = data[`event-${key}-enabled`];
    const url = data[`event-${key}-url`];
    if (enabled && url) {
      config.Events[key] = { IsEnabled: true, WebHookEndpoints: [{ Url: url }] };
    }
  }

  return config;
}
