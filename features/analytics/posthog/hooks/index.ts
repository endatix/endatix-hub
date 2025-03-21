// Import usePostHog directly from posthog-js/react
export { usePostHog } from "posthog-js/react";

// Export specialized tracking hooks
export * from "./useTrackEvent";
export * from "./useTrackForms";
export * from "./useFeatureFlag";
export * from "./useIdentify";