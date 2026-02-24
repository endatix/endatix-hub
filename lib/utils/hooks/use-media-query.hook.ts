"use client";

import { useEffect, useState } from "react";

/** Breakpoint (max-width) below which layout is considered "mobile". Aligns with Tailwind `md`. */
export const MOBILE_BREAKPOINT_PX = 768;

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

/**
 * React hook to check if a media query matches.
 * @param query - The media query to check.
 * @returns True if the media query matches, false otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const media = globalThis.window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/**
 * Convenience hook: true when viewport is below the mobile breakpoint (e.g. sidebar collapse).
 * Uses the same breakpoint as Tailwind's `md`.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_MEDIA_QUERY);
}
