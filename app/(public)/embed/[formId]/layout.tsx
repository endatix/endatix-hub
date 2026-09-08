import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-provider";
import { getClientEndatixConfig } from "@/features/config/server";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Endatix Form",
  robots: ROBOTS.hiddenPage,
};

export default async function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, endatixConfig] = await Promise.all([
    auth(),
    getClientEndatixConfig(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      {/* No globals.css (DESIGN.md §9) — zero UA body margin or the iframe shows an 8px gutter. */}
      <body style={{ margin: 0 }}>
        <AppProvider
          options={AppOptions.PublicPages}
          session={session}
          endatixConfig={endatixConfig}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
