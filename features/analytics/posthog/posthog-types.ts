/**
 * PostHog related type definitions
 */

export type PostHogConfig = {
  enabled: boolean;
  apiKey: string;
  apiHost: string;
  debug?: boolean;
};

export type PostHogIdentifyOptions = {
  distinctId: string;
  userProperties?: Record<string, string | number | boolean | null>;
};

export type PostHogEventProperties = Record<string, string | number | boolean | null>;

export type PostHogClientOptions = {
  distinctId?: string;
  capturePageview?: boolean;
  disableSessionRecording?: boolean;
  apiOptions?: {
    flushInterval?: number;
    flushAt?: number;
  };
}; 