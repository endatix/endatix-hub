import type { Metadata } from "next";
import Link from "next/link";
import { getPublicTenantAction } from "@/features/tenants/public-tenant/public-tenant.action";
import { TenantPublicNotFound } from "@/features/tenants/public-tenant/ui/tenant-public-not-found";
import TenantRegisterForm from "@/features/tenants/public-tenant/ui/tenant-register-form";
import { TenantRegistrationClosed } from "@/features/tenants/public-tenant/ui/tenant-registration-closed";
import { tenantPublicSignInPath } from "@/features/platform-admin/tenant-registration";
import { Result } from "@/lib/result";

export const metadata: Metadata = {
  title: "Create account | Endatix Hub",
};

interface TenantRegisterPageProps {
  params: Promise<{ tenantSlug: string }>;
}

const TenantRegisterPage = async ({ params }: TenantRegisterPageProps) => {
  const { tenantSlug } = await params;
  const tenantResult = await getPublicTenantAction(tenantSlug);
  if (!Result.isSuccess(tenantResult)) {
    return tenantResult.statusCode === 404 ? (
      <TenantPublicNotFound />
    ) : (
      <p className="text-sm text-muted-foreground">{tenantResult.message}</p>
    );
  }

  const tenant = tenantResult.value;
  if (!tenant.selfRegistrationEnabled) {
    return (
      <TenantRegistrationClosed
        tenantName={tenant.name}
        shortUrl={tenant.shortUrl}
      />
    );
  }

  return (
    <>
      <TenantRegisterForm shortUrl={tenant.shortUrl} tenantName={tenant.name} />
      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link
          href={tenantPublicSignInPath(tenant.shortUrl)}
          className="underline"
        >
          Sign in
        </Link>
      </div>
    </>
  );
};

export default TenantRegisterPage;
