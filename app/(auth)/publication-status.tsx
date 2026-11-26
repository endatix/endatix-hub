import type { ReactNode } from "react";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";

export function PublicationStatus({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return <>
    <AuthLogo />
    <AuthStatus title={title} tone="warning">{children ?? <RetryRequest />}</AuthStatus>
  </>;
}
