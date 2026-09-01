import { exitAssumeAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";
import { SupportAccessBannerView } from "@/features/platform-admin/assume-tenant/ui/support-access-banner-view";

interface SupportAccessBannerProps {
  tenantName?: string;
}

export function SupportAccessBanner({ tenantName }: Readonly<SupportAccessBannerProps>) {
  const title = tenantName
    ? `Support access — ${tenantName}`
    : "Support access";

  async function exitTenant() {
    "use server";
    // exitAssumeAction redirects on success; the returned Result is only
    // populated on failure and there is nowhere to render it from a
    // server-component banner, so it is intentionally not surfaced here.
    await exitAssumeAction();
  }

  return <SupportAccessBannerView title={title} exitAction={exitTenant} />;
}
