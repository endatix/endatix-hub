import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import { getOsClass } from "@/lib/utils/next-utils";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getMetadataBase } from "@/lib/seo";
import { getClientEndatixConfig } from "@/features/config/server";
import { SupportAccessBanner } from "@/features/platform-admin/assume-tenant/ui/support-access-banner";
import { readAssumeSession } from "@/features/platform-admin/assume-tenant/read-assume-session";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Endatix Hub",
  description: "Customizable form management platform",
  generator: "Endatix",
  keywords: [
    "endatix",
    "endatix hub",
    "endatix hub app",
    "forms-management",
    "ai-form-builder",
  ],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
};

interface RootLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  nav: React.ReactNode;
}

export default async function RootLayout({
  children,
  header,
  nav,
}: RootLayoutProps) {
  const [requestHeaders, session, cookieStore, endatixConfig] =
    await Promise.all([headers(), auth(), cookies(), getClientEndatixConfig()]);
  const osClass = getOsClass(requestHeaders);
  const sidebarValue = cookieStore.get("sidebar_state");
  const defaultSidebarOpen = sidebarValue?.value === "true";

  return (
    <html lang="en" className={osClass} suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider
          session={session}
          sidebarDefaultOpen={defaultSidebarOpen}
          endatixConfig={endatixConfig}
        >
          {nav}
          <main data-slot="sidebar-inset">
            {header}
            <AssumedTenantBanner accessToken={session?.accessToken} />
            <div data-slot="content-wrapper">{children}</div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}

async function AssumedTenantBanner({
  accessToken,
}: {
  accessToken?: string;
}) {
  const assumed = readAssumeSession(accessToken);
  if (!assumed || !accessToken) {
    return null;
  }

  const api = new EndatixApi(accessToken);
  const tenant = await api.platformTenants.getById(assumed.tenantId);
  const tenantName = ApiResult.isSuccess(tenant) ? tenant.data.name : undefined;

  return <SupportAccessBanner tenantName={tenantName} />;
}
