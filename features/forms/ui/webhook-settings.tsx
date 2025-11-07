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
import type { TenantSettings, WebHookConfiguration } from "@/types";
import { Result } from "@/lib/result";
import { ErrorMessage } from "@/components/forms/error-message";

interface WebhookSettingsProps {
  formId: string;
  initialSettings?: string;
}

type WebhookEvent = {
  key: string;
  label: string;
  enabled: boolean;
  url: string;
};

const WEBHOOK_EVENTS = [
  { key: "SubmissionCompleted", label: "Submission Completed" },
  { key: "FormCreated", label: "Form Created" },
  { key: "FormUpdated", label: "Form Updated" },
  { key: "FormEnabledStateChanged", label: "Form Enabled State Changed" },
  { key: "FormDeleted", label: "Form Deleted" },
];

const initialState = {
  isSuccess: false,
};

export function WebhookSettings({
  formId,
  initialSettings,
}: WebhookSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    updateWebhookSettingsAction,
    initialState
  );

  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(
    null,
  );
  const [isLoadingTenantSettings, setIsLoadingTenantSettings] = useState(true);
  const [tenantSettingsError, setTenantSettingsError] = useState<string | null>(
    null,
  );

  const parseSettings = (settingsJson: string | undefined | null): WebhookEvent[] => {
    if (!settingsJson) {
      return WEBHOOK_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        enabled: false,
        url: "",
      }));
    }

    try {
      const config: WebHookConfiguration = JSON.parse(settingsJson);
      return WEBHOOK_EVENTS.map((event) => {
        const eventConfig = config.Events?.[event.key];
        const endpoint = eventConfig?.WebHookEndpoints?.[0];
        return {
          key: event.key,
          label: event.label,
          enabled: eventConfig?.IsEnabled ?? false,
          url: endpoint?.Url ?? "",
        };
      });
    } catch (error) {
      console.error("Failed to parse webhook settings", error);
      return WEBHOOK_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        enabled: false,
        url: "",
      }));
    }
  };

  const parseTenantWebhookSettings = (
    tenantSettings: TenantSettings | null,
  ): WebhookEvent[] => {
    if (!tenantSettings?.webHookSettings?.events) {
      return WEBHOOK_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        enabled: false,
        url: "",
      }));
    }

    return WEBHOOK_EVENTS.map((event) => {
      const eventConfig = tenantSettings.webHookSettings?.events[event.key];
      const endpoint = eventConfig?.webHookEndpoints?.[0];
      return {
        key: event.key,
        label: event.label,
        enabled: eventConfig?.isEnabled ?? false,
        url: endpoint?.url ?? "",
      };
    });
  };

  const [useCustomSettings, setUseCustomSettings] = useState(
    state?.values?.useCustomSettings ?? !!initialSettings,
  );
  const [events, setEvents] = useState<WebhookEvent[]>(() => {
    // If there already are values, use those
    if (state?.values) {
      return WEBHOOK_EVENTS.map((event) => ({
        key: event.key,
        label: event.label,
        enabled: state.values?.[`event-${event.key}-enabled`] as boolean || false,
        url: state.values?.[`event-${event.key}-url`] as string || "",
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
          setTenantSettingsError(result.message || "Failed to load tenant settings");
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

    fetchTenantSettings();
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
    <form action={formAction} className="space-y-4 max-w-2xl mx-auto">
      <SectionTitle
        title="Webhooks"
        headingClassName="text-xl mt-4"
      />

      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="useCustomSettings" value={String(useCustomSettings)} />
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
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading settings...
          </p>
        </div>
      )}

      {tenantSettingsError && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{tenantSettingsError}</p>
        </div>
      )}

      {!isLoadingTenantSettings && !tenantSettingsError && (
        <>
          {useCustomSettings && (
            <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-sm text-amber-800">
                Using custom webhooks configuration for this form
              </span>
            </div>
          )}

          {!useCustomSettings && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right">{event.label}</span>
                    <div className="col-span-3">
                      {event.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                  </div>
                )}

                {useCustomSettings && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right">{event.label}</span>
                    <div className="col-span-3 flex items-center space-x-2">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor={`webhook-url-${event.key}`}
                      className="text-right text-muted-foreground text-sm"
                    >
                      Webhook URL
                    </Label>
                    <div className="col-span-3 space-y-1">
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
