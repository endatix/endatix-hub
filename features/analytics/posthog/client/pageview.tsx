"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTrackEvent } from "@/features/analytics/posthog";

const POSTHOG_PAGEVIEW = "$pageview";

interface PostHogPageViewProps {
  /**
   * Optional callback to customize properties sent with page view event
   */
  getPageProperties?: (
    pathname: string,
    searchParams: URLSearchParams,
  ) => Record<string, string | number | boolean | null>;
}

/**
 * Component that automatically tracks page views
 * Place this in your app layout or specific pages where you want to track views
 */
export function PostHogPageView({
  getPageProperties,
}: PostHogPageViewProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef<string | null>(null);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    // Skip tracking if the path hasn't changed
    if (previousPathRef.current === pathname) {
      return;
    }

    // Track the page view
    const url =
      window.location.origin +
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Base properties for the page view event
    const baseProperties = {
      url,
      path: pathname,
      referrer: document.referrer,
      title: document.title,
      search: searchParams?.toString() || null,
    };

    // Add custom properties if provided
    const customProperties = getPageProperties
      ? getPageProperties(pathname, searchParams as URLSearchParams)
      : {};

    // Track the page view event with combined properties
    trackEvent(POSTHOG_PAGEVIEW, {
      ...baseProperties,
      ...customProperties,
      timestamp: new Date().toISOString(),
    });

    // Update the previous path
    previousPathRef.current = pathname;
  }, [pathname, searchParams, getPageProperties, trackEvent]);

  return null;
}
