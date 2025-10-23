"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertBehavior } from "../types";
import { useDismissedAlertsStore } from "./use-dismissed-alerts-store.hook";

interface SystemAlertMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  alertId: string;
  title: string;
  description: string;
  behavior?: AlertBehavior;
}

/**
 * A system alert message component that can be used to display alerts to the user.
 * @param alertId - The ID of the alert.
 * @param title - The title of the alert.
 * @param description - The description of the alert.
 * @param behavior - The behavior of the alert.
 * @param props - The props of the alert.
 */
const SystemAlertMessage = ({
  alertId,
  title,
  description,
  behavior = AlertBehavior.ALWAYS_SHOW,
  ...props
}: SystemAlertMessageProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const store = useDismissedAlertsStore();

  useEffect(() => {
    if (behavior === AlertBehavior.REMEMBER_DISMISS && store) {
      setIsVisible(!store.isAlertDismissed(alertId));
    } else {
      setIsVisible(true);
    }
  }, [behavior, alertId, store]);

  const handleDismiss = () => {
    if (behavior === AlertBehavior.REMEMBER_DISMISS && store) {
      store.dismissAlert(alertId);
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      className="w-auto relative flex items-center text-green-500"
      {...props}
      id={alertId}
    >
      <CircleCheckBig className="h-4 w-4 mr-2 text-green-500" />
      <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
      <AlertDescription className="text-sm">{description}</AlertDescription>
      <div className="flex justify-end absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="mt-2 relative"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default SystemAlertMessage;
