import { tryParseJson } from "@/lib/utils/type-parsers";
import { DismissedAlerts } from "./types";
import { Result } from "@/lib/result";

const DISMISSED_ALERTS_KEY = "ehx_x_alerts";

export function createDismissedAlertsStore() {
  if (typeof window === 'undefined') {
    throw new Error('DismissedAlertsStore can only be used in browser environments');
  }
  
  const storage = localStorage;
  if (!storage) {
    throw new Error("Local storage is required for DismissedAlertsStore");
  }

  const getDismissedAlerts = (): DismissedAlerts => {
    const dismissedAlerts = storage.getItem(DISMISSED_ALERTS_KEY);
    if (!dismissedAlerts) {
      return DismissedAlerts.empty();
    }

    const parseResult = tryParseJson<DismissedAlerts>(dismissedAlerts);

    if (Result.isError(parseResult)) {
      return DismissedAlerts.empty();
    }

    return parseResult.value;
  };

  const isAlertDismissed = (alertId: string): boolean => {
    const dismissedAlerts = getDismissedAlerts();
    return dismissedAlerts[alertId] !== undefined;
  };

  const dismissAlert = (alertId: string): void => {
    const dismissedAlerts = getDismissedAlerts();
    dismissedAlerts[alertId] = new Date();
    storage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(dismissedAlerts));
  };

  const cleanStorage = (options?: { dismissedBefore?: Date }): void => {
    const { dismissedBefore } = options ?? {};
    const shouldCleanEntireStorage =
      !dismissedBefore || dismissedBefore > new Date();
    if (shouldCleanEntireStorage) {
      storage.removeItem(DISMISSED_ALERTS_KEY);
      return;
    }

    const dismissedAlerts = getDismissedAlerts();
    const alertsToKeep = Object.keys(dismissedAlerts).filter(
      (alertId) => dismissedAlerts[alertId] > dismissedBefore,
    );
    storage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(alertsToKeep));
  };

  return {
    getDismissedAlerts,
    isAlertDismissed,
    dismissAlert,
    cleanStorage,
  };
}
