import type { Metadata } from "next";
import Link from "next/link";
import { auth, authPresentation } from "@/auth";
import {
  ENDATIX_AUTH_PROVIDER_ID,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure";
import SigninForm from "@/features/auth/use-cases/signin/ui/signin-form";
import { getPublicTenantAction } from "@/features/tenants/public-tenant/public-tenant.action";
import { TenantPublicNotFound } from "@/features/tenants/public-tenant/ui/tenant-public-not-found";
import {
  filterTenantAuthProviders,
  tenantPublicRegisterPath,
} from "@/features/platform-admin/create-tenant/tenant-self-registration";
import { Result } from "@/lib/result";

export const metadata: Metadata = {
  title: "Sign in | Endatix Hub",
};

interface TenantSignInPageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ [RETURN_URL_PARAM]?: string }>;
}

const TenantSignInPage = async ({
  params,
  searchParams,
}: TenantSignInPageProps) => {
  const { tenantSlug } = await params;
  const { returnUrl } = await searchParams;
  const tenantResult = await getPublicTenantAction(tenantSlug);
  if (!Result.isSuccess(tenantResult)) {
    return <TenantPublicNotFound />;
  }

  const tenant = tenantResult.value;
  const filteredProviders = filterTenantAuthProviders(
    authPresentation,
    tenant.allowedAuthProviders,
  );
  const endatixAuthProvider = filteredProviders.find(
    (provider) => provider.id === ENDATIX_AUTH_PROVIDER_ID,
  );
  const externalAuthProviders = filteredProviders.filter(
    (provider) => provider.id !== ENDATIX_AUTH_PROVIDER_ID,
  );

  const authSession = await auth();
  if (authSession?.user && !authSession.error) {
    return (
      <p className="text-sm text-muted-foreground">
        You are already signed in.{" "}
        <Link href="/forms" className="underline">
          Continue to Hub
        </Link>
      </p>
    );
  }

  if (!endatixAuthProvider) {
    return <div>No Endatix auth provider found</div>;
  }

  return (
    <>
      <p className="text-center text-sm text-muted-foreground">{tenant.name}</p>
      <SigninForm
        endatixAuthProvider={endatixAuthProvider}
        externalAuthProviders={externalAuthProviders}
        returnUrl={returnUrl}
      />
      {tenant.selfRegistrationEnabled ? (
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={tenantPublicRegisterPath(tenant.slug)}
            className="underline"
          >
            Create account
          </Link>
        </div>
      ) : null}
    </>
  );
};

export default TenantSignInPage;
