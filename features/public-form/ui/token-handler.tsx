"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setTokenFromUrlAction } from "../application/actions/set-token-from-url.action";

interface TokenHandlerProps {
  formId: string;
}

/**
 * Client component that handles token from URL:
 * 1. Extracts token from URL search params
 * 2. Saves it to cookie via server action
 * 3. Removes token from URL to prevent reload issues
 */
export function TokenHandler({ formId }: TokenHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    // Only process once and only if token exists
    if (!token || hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    // Save token to cookie via server action
    setTokenFromUrlAction(formId, token).then(() => {
      // Remove token from URL to prevent issues on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("token");

      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;

      window.history.replaceState(null, "", newUrl);
    });
  }, [searchParams, router, formId]);

  return null; // This component doesn't render anything
}
