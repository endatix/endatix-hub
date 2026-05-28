"use client";

import { toast } from "@/components/ui/toast";
import { parseTokenExpiry } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/** Tracks access-token expiry and surfaces toast warnings for public edit links. */
export function usePublicEditTokenExpiry(
  token: string | undefined,
): number | null {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const shownWarningsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!token) {
      return;
    }

    const expiryTime = parseTokenExpiry(token);
    if (!expiryTime) {
      return;
    }

    const updateTimeRemaining = () => {
      const remaining = expiryTime - Date.now();
      const minutes = Math.floor(remaining / 60000);
      setMinutesRemaining(minutes);

      if (minutes === 30 && !shownWarningsRef.current.has(30)) {
        toast.warning(
          "Your edit access will expire in 30 minutes. Please save your changes soon.",
        );
        shownWarningsRef.current.add(30);
      } else if (minutes === 10 && !shownWarningsRef.current.has(10)) {
        toast.warning(
          "Your edit access will expire in 10 minutes. Save your changes!",
        );
        shownWarningsRef.current.add(10);
      } else if (minutes === 5 && !shownWarningsRef.current.has(5)) {
        toast.error(
          "Your access expires in 5 minutes! Save now or your changes may be lost.",
        );
        shownWarningsRef.current.add(5);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return minutesRemaining;
}
