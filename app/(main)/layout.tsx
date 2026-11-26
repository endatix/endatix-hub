import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getOsClass } from "@/lib/utils/next-utils";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getMetadataBase } from "@/lib/seo";
import { getClientEndatixConfig } from "@/features/config/server";
import {
  brandKeywords,
  brandLayoutMetadata,
  getBrand,
} from "@/lib/branding/server";
import { SupportAccessBannerSlot } from "@/features/platform-admin/assume-tenant/ui/support-access-banner-slot";
import { NoticeSlot } from "@/features/auth/required-actions/notice-slot";
import { Suspense } from "react";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { PersonalGuideSlot } from "@/features/onboarding/personal-guide/personal-guide-slot";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    ...(await brandLayoutMetadata()),
    metadataBase: getMetadataBase(),
    description: "Customizable form management platform",
    generator: brand.shortName,
    keywords: [...brandKeywords(brand), "forms-management", "ai-form-builder"],
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  nav: React.ReactNode;
}

export default async function RootLayout({
  children,
  header,
  nav,
}: Readonly<RootLayoutProps>) {
  const [requestHeaders, session, cookieStore, endatixConfig, brand] =
    await Promise.all([
      headers(),
      auth(),
      cookies(),
      getClientEndatixConfig(),
      getBrand(),
    ]);
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value === "true";
  return (
    <html lang="en" className={getOsClass(requestHeaders)} suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider
          session={session}
          sidebarDefaultOpen={defaultSidebarOpen}
          endatixConfig={endatixConfig}
          brand={brand}
        >
          {nav}
          <PersonalGuideSlot />
          <main data-slot="sidebar-inset" data-workspace-scope={workspaceScope(session?.accessToken)}>
            <SupportAccessBannerSlot accessToken={session?.accessToken} />
            <Suspense fallback={null}>
              <NoticeSlot session={session} />
            </Suspense>
            {header}
            <div data-slot="content-wrapper">{children}</div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
