import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tenantPublicSignInPath } from "@/features/platform-admin/tenant-registration";

export function TenantRegistrationClosed({
  tenantName,
  tenantSlug,
}: Readonly<{ tenantName: string; tenantSlug: string }>) {
  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>Registration is closed</CardTitle>
        <CardDescription>
          {tenantName} is not accepting new accounts.{" "}
          <Link href={tenantPublicSignInPath(tenantSlug)} className="underline">
            Sign in
          </Link>{" "}
          if you already have access.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
