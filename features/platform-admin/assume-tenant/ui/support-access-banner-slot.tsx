import { Suspense } from "react";
import { exitAssumeAction } from "../assume-tenant.action";
import { getAssumedTenantName } from "../get-assumed-tenant-name.server";
import { readAssumeSession } from "../read-assume-session";
import { SupportAccessBannerView } from "./support-access-banner-view";

interface SupportAccessBannerSlotProps {
  accessToken?: string;
}

/**
 * Support-access banner for an assumed session, mounted by `(main)/layout.tsx`.
 *
 * Deliberately synchronous: whether to show the banner is decided from the JWT,
 * and only the tenant name streams. An `await` here would block every route
 * under the layout, and a `null` fallback would let the sticky banner pop in
 * after the page had painted.
 */
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
