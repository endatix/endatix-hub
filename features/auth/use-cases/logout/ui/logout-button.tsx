"use client";

import { logoutAction } from "@/features/auth/use-cases/logout/logout.action";
import { useTransition } from "react";
import { resetTrackedIdentity } from "@/features/analytics/posthog";

const LogoutButton = () => {
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    startTransition(async () => {
      resetTrackedIdentity();
      
      await logoutAction();
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
