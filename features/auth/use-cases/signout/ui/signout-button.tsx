"use client";

import { logoutAction } from "@/features/auth/use-cases/signout/signout.action";
import { useTransition } from "react";
import { useTrackEvent } from "@/features/analytics/posthog";
import { Button } from "@/components/ui/button";

const SignoutButton = () => {
  const [isPending, startTransition] = useTransition();
  const { trackEvent, trackException } = useTrackEvent();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
        // Track successful logout
        trackEvent("auth_logout", {
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to logout:", error);
        trackException(error, {
          operation: "auth_logout",
          timestamp: new Date().toISOString(),
        });
      }
    });
  };

  if (isPending) {
    return <div>Logging out...</div>;
  }

  return (
    <Button className="cursor-pointer" onClick={handleLogout}>
      Sign out
    </Button>
  );
};

export default SignoutButton;
