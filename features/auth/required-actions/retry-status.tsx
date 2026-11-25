"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthStatus } from "../ui/auth-status";

export function RetryStatus() {
  const router = useRouter();
  return (
    <AuthStatus tone="warning" title="Account status is unavailable">
      <Button onClick={() => router.refresh()}>Try again</Button>
    </AuthStatus>
  );
}
