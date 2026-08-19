import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-provider";
import { getClientEndatixConfig } from "@/features/config";
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
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      <body>
        <AppProvider
          options={AppOptions.PublicPages}
          session={session}
          endatixConfig={getClientEndatixConfig()}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
