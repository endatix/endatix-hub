import { exitAssumeAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";
import { SupportAccessBannerView } from "@/features/platform-admin/assume-tenant/ui/support-access-banner-view";

interface SupportAccessBannerProps {
  tenantName?: string;
}

export function SupportAccessBanner({
  tenantName,
}: Readonly<SupportAccessBannerProps>) {
  const title = tenantName
    ? `Support access — ${tenantName}`
    : "Support access";

  return (
    <SupportAccessBannerView title={title} exitAction={exitAssumeAction} />
  );
}
