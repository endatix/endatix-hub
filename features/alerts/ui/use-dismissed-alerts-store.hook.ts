"use client";

import { useRef } from "react";
import { createDismissedAlertsStore } from "../dismissed-alerts-store";

let _storeInstance: ReturnType<typeof createDismissedAlertsStore> | null = null;

export function useDismissedAlertsStore() {
  const storeRef = useRef<ReturnType<typeof createDismissedAlertsStore> | null>(
    null,
  );

  if (typeof window !== "undefined" && !_storeInstance) {
    _storeInstance = createDismissedAlertsStore();
  }

  storeRef.current = _storeInstance;

  return storeRef.current;
}
