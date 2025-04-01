"use client";

import { logoutAction } from "@/features/auth/use-cases/logout/logout.action";
import { useTransition } from "react";
import { useTrackEvent } from '@/features/analytics/posthog';

const LogoutButton = () => {
  const [isPending, startTransition] = useTransition();
  const { trackEvent, trackException } = useTrackEvent();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
        // Track successful logout
        trackEvent('auth_logout', {
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to logout:', error);
        trackException(error, {
          operation: 'auth_logout',
          timestamp: new Date().toISOString(),
        });
      }
    });
  };

  if (isPending) {
    return <div>Logging out...</div>;
  }

  return (
    <div className="cursor-pointer" onClick={handleLogout}>
      Logout
    </div>
  );
};

export default LogoutButton;
