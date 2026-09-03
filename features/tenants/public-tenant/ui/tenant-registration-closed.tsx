import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import { tenantPublicSignInPath } from "@/features/platform-admin/tenant-registration";

export function TenantRegistrationClosed({
  tenantName,
  shortUrl,
}: Readonly<{ tenantName: string; shortUrl: string }>) {
  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="warning"
        title="Registration is closed"
        description={`${tenantName} is not accepting new accounts.`}
      >
        <Button asChild className="w-full">
          <Link href={tenantPublicSignInPath(shortUrl)}>Sign in</Link>
        </Button>
      </AuthStatus>
    </>
  );
}
