"use client";

import { useState, useEffect, useActionState } from "react";
import { SectionTitle } from "@/components/headings/section-title";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Spinner } from "@/components/loaders/spinner";
import { toast } from "@/components/ui/toast";
import { updateWebhookSettingsAction } from "../application/actions/update-webhook-settings.action";
import { getTenantSettingsAction } from "../application/actions/get-tenant-settings.action";
import type { TenantSettings } from "@/lib/endatix-api/tenant";
import { Result } from "@/lib/result";
import { ErrorMessage } from "@/components/forms/error-message";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import type {
  WebhookEventKey,
  WebhookSettingsState,
} from "../application/actions/types/webhook-settings.types";
import {
  readFormWebhookEvents,
  readTenantWebhookEvents,
  type WebhookEventValue,
  type WebhookEventValues,
} from "../application/webhook-settings-document";

interface WebhookSettingsProps {
  formId: string;
  initialSettings?: string;
}

type WebhookEventInfo = {
  key: WebhookEventKey;
  label: string;
  description?: string;
};

type WebhookEvent = WebhookEventInfo & WebhookEventValue;

/** Form-level webhook UI: Form Created is tenant-only (fires before per-form config exists). */
const WEBHOOK_EVENTS: readonly WebhookEventInfo[] = [
  { key: "SubmissionCompleted", label: "Submission Completed" },
  {
    key: "SubmissionClosed",
    label: "Submission closed",
    description:
      "Fires once when a submission ends in a closed outcome: screened out, quota full, cancelled, or a closed status the host registered.",
  },
  { key: "FormUpdated", label: "Form Updated" },
  { key: "FormEnabledStateChanged", label: "Form Enabled State Changed" },
  { key: "FormDeleted", label: "Form Deleted" },
];

function toWebhookEvents(values: WebhookEventValues): WebhookEvent[] {
  return WEBHOOK_EVENTS.map((event) => ({ ...event, ...values[event.key] }));
}

const parseSettings = (settingsJson: string | undefined) =>
  toWebhookEvents(readFormWebhookEvents(settingsJson));

const parseTenantWebhookSettings = (tenantSettings: TenantSettings | null) =>
  toWebhookEvents(readTenantWebhookEvents(tenantSettings?.webHookSettings));

function EventLabel({ event }: Readonly<{ event: WebhookEvent }>) {
  return (
    <div className="text-right">
      <span>{event.label}</span>
      {event.description && (
        <p className="text-xs text-muted-foreground">{event.description}</p>
      )}
    </div>
  );
}

const initialState: WebhookSettingsState = ServerActionState.emptyState();

export function WebhookSettings({
  formId,
  initialSettings,
}: WebhookSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    updateWebhookSettingsAction,
    initialState,
  );

  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(
    null,
  );
  const [isLoadingTenantSettings, setIsLoadingTenantSettings] = useState(true);
  const [tenantSettingsError, setTenantSettingsError] = useState<string | null>(
    null,
  );

  const [useCustomSettings, setUseCustomSettings] = useState(
    state?.data?.useCustomSettings ?? !!initialSettings,
  );
  const [events, setEvents] = useState<WebhookEvent[]>(() => {
    if (state?.data) {
      return WEBHOOK_EVENTS.map((event) => ({
        ...event,
        enabled:
          (state.data?.[`event-${event.key}-enabled`] as boolean) || false,
        url: (state.data?.[`event-${event.key}-url`] as string) || "",
      }));
    }
    return parseSettings(initialSettings);
  });

  useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        setIsLoadingTenantSettings(true);
        setTenantSettingsError(null);
        const result = await getTenantSettingsAction();

        if (Result.isSuccess(result)) {
          setTenantSettings(result.value);
        } else {
          setTenantSettingsError(
            result.message || "Failed to load tenant settings",
          );
        }
      } catch (error) {
        console.error("Failed to fetch tenant settings", error);
        setTenantSettingsError(
          error instanceof Error
            ? error.message
            : "Failed to load tenant settings",
        );
      } finally {
        setIsLoadingTenantSettings(false);
      }
    };

    void fetchTenantSettings();
  }, []);

  useEffect(() => {
    if (state?.isSuccess) {
      toast.success("Webhook settings saved.");
    } else if (state?.formErrors && state.formErrors.length > 0) {
      toast.error(state.formErrors[0]);
    }
  }, [state?.isSuccess, state?.formErrors]);

  const handleEventToggle = (eventKey: string, enabled: boolean) => {
    setEvents(
      events.map((event) =>
        event.key === eventKey ? { ...event, enabled } : event,
      ),
    );
  };

  const handleUrlChange = (eventKey: string, url: string) => {
    setEvents(
      events.map((event) =>
        event.key === eventKey ? { ...event, url } : event,
      ),
    );
  };

  const handleCustomSettingsToggle = (enabled: boolean) => {
    setUseCustomSettings(enabled);
    if (enabled) {
      if (initialSettings) {
        setEvents(parseSettings(initialSettings));
      } else if (tenantSettings) {
        setEvents(parseTenantWebhookSettings(tenantSettings));
      } else {
        setEvents(parseSettings(undefined));
      }
    }
  };

  const displayEvents = useCustomSettings
    ? events
    : parseTenantWebhookSettings(tenantSettings);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4">
      <SectionTitle title="Webhooks" headingClassName="text-xl mt-4" />

      <input type="hidden" name="formId" value={formId} />
      <input
        type="hidden"
        name="useCustomSettings"
        value={String(useCustomSettings)}
      />
      {events.map((event) => (
        <div key={event.key}>
          <input
            type="hidden"
            name={`event-${event.key}-enabled`}
            value={String(event.enabled)}
          />
          <input
            type="hidden"
            name={`event-${event.key}-url`}
            value={event.url}
          />
        </div>
      ))}

      <p className="text-base font-medium">
        Events that trigger webhook notifications
      </p>

      {isLoadingTenantSettings && (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading settings...
          </p>
        </div>
      )}

      {tenantSettingsError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{tenantSettingsError}</p>
        </div>
      )}

      {!isLoadingTenantSettings && !tenantSettingsError && (
        <>
          {useCustomSettings && (
            <div className="flex items-center space-x-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-sm text-amber-800">
                Using custom webhooks configuration for this form
              </span>
            </div>
          )}

          {!useCustomSettings && (
            <div className="flex items-center space-x-2 rounded-md bg-muted p-3">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-sm text-muted-foreground">
                Using tenant default webhooks configuration
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2 py-2">
            <Switch
              id="use-custom-webhooks"
              checked={useCustomSettings}
              onCheckedChange={handleCustomSettingsToggle}
              disabled={isPending}
            />
            <Label htmlFor="use-custom-webhooks" className="font-normal">
              Override tenant defaults
            </Label>
          </div>

          <div className="space-y-8 pt-2">
            {displayEvents.map((event) => (
              <div key={event.key} className="space-y-2">
                {!useCustomSettings && (
                  <div className="grid grid-cols-[minmax(15rem,42%)_1fr] items-center gap-4">
                    <EventLabel event={event} />
                    <div className="min-w-0">
                      {event.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                  </div>
                )}

                {useCustomSettings && (
                  <div className="grid grid-cols-[minmax(15rem,42%)_1fr] items-center gap-4">
                    <EventLabel event={event} />
                    <div className="flex min-w-0 items-center space-x-2">
                      <Switch
                        id={`webhook-${event.key}`}
                        checked={event.enabled}
                        onCheckedChange={(enabled) =>
                          handleEventToggle(event.key, enabled)
                        }
                        disabled={isPending}
                      />
                      <Label htmlFor={`webhook-${event.key}`}>
                        {event.enabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                )}

                {event.enabled && (
                  <div className="grid grid-cols-[minmax(15rem,42%)_1fr] items-center gap-4">
                    <Label
                      htmlFor={`webhook-url-${event.key}`}
                      className="w-full justify-end text-right text-sm font-normal text-muted-foreground"
                    >
                      Webhook URL
                    </Label>
                    <div className="min-w-0 space-y-1">
                      <Input
                        id={`webhook-url-${event.key}`}
                        type="url"
                        placeholder="https://example.com/webhook"
                        value={event.url}
                        onChange={(e) =>
                          handleUrlChange(event.key, e.target.value)
                        }
                        disabled={isPending || !useCustomSettings}
                      />
                      {state?.errors?.[`event-${event.key}-url`] && (
                        <ErrorMessage
                          message={state.errors[`event-${event.key}-url`]}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
