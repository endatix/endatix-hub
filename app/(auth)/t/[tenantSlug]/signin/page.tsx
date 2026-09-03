import type { Metadata } from "next";
import Link from "next/link";
import { auth, authPresentation } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  ENDATIX_AUTH_PROVIDER_ID,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import SigninForm from "@/features/auth/use-cases/signin/ui/signin-form";
import { filterTenantAuthProviders } from "@/features/tenants/public-tenant/auth-providers";
import { getPublicTenantAction } from "@/features/tenants/public-tenant/public-tenant.action";
import { TenantPublicUnavailable } from "@/features/tenants/public-tenant/ui/tenant-public-unavailable";
import { tenantPublicRegisterPath } from "@/features/platform-admin/tenant-registration";
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
  const authSession = await auth();
  if (authSession?.user && !authSession.error) {
    return (
      <>
        <AuthLogo className="mb-2" />
        <AuthStatus
          tone="prompt"
          title="You are already signed in"
          description="Sign out first if you want to use a different account."
        >
          <Button asChild className="w-full">
            <Link href="/forms">Continue to Hub</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link href="/signout">Sign out</Link>
          </Button>
        </AuthStatus>
      </>
    );
  }

  const { tenantSlug } = await params;
  const { returnUrl } = await searchParams;
  const tenantResult = await getPublicTenantAction(tenantSlug);
  if (!Result.isSuccess(tenantResult)) {
    return <TenantPublicUnavailable error={tenantResult} />;
  }

  const tenant = tenantResult.value;
  const filteredProviders = filterTenantAuthProviders(
    authPresentation,
    tenant.allowedAuthProviders,
  );
  const endatixAuthProvider = filteredProviders.find(
    (provider) => provider.id === ENDATIX_AUTH_PROVIDER_ID,
  );
  if (!endatixAuthProvider) {
    return (
      <>
        <AuthLogo className="mb-2" />
        <AuthStatus
          tone="warning"
          title="Sign-in is not available"
          description={`${tenant.name} has no sign-in method enabled. Contact the organization for access.`}
        />
      </>
    );
  }

  return (
    <>
      <p className="text-center text-sm text-muted-foreground">{tenant.name}</p>
      <SigninForm
        endatixAuthProvider={endatixAuthProvider}
        externalAuthProviders={filteredProviders.filter(
          (provider) => provider.id !== ENDATIX_AUTH_PROVIDER_ID,
        )}
        returnUrl={returnUrl}
      />
      {tenant.selfRegistrationEnabled && (
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={tenantPublicRegisterPath(tenant.shortUrl)}
            className="underline"
          >
            Create account
          </Link>
        </div>
      )}
    </>
  );
};

export default TenantSignInPage;
