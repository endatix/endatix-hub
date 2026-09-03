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
  shortUrl,
}: Readonly<{ tenantName: string; shortUrl: string }>) {
  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>Registration is closed</CardTitle>
        <CardDescription>
          {tenantName} is not accepting new accounts.{" "}
          <Link href={tenantPublicSignInPath(shortUrl)} className="underline">
            Sign in
          </Link>{" "}
          if you already have access.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
