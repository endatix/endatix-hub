import { Suspense } from "react";
import { exitAssumeAction } from "../assume-tenant.action";
import { getAssumedTenantName } from "../get-assumed-tenant-name.server";
import { readAssumeSession } from "../read-assume-session";
import { SupportAccessBannerView } from "./support-access-banner-view";

interface SupportAccessBannerSlotProps {
  accessToken?: string;
}

export function SupportAccessBannerSlot({
  accessToken,
}: Readonly<SupportAccessBannerSlotProps>) {
  if (!accessToken) {
    return null;
  }

  const assumed = readAssumeSession(accessToken);
  if (!assumed) {
    return null;
  }

  return (
    <Suspense
      fallback={<SupportAccessBannerView exitAction={exitAssumeAction} />}
    >
      <NamedSupportAccessBanner
        accessToken={accessToken}
        tenantId={assumed.tenantId}
      />
    </Suspense>
  );
}

async function NamedSupportAccessBanner({
  accessToken,
  tenantId,
}: Readonly<{ accessToken: string; tenantId: string }>) {
  return (
    <SupportAccessBannerView
      tenantName={await getAssumedTenantName(accessToken, tenantId)}
      exitAction={exitAssumeAction}
    />
  );
}
