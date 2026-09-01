import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-provider";
import { getClientEndatixConfig } from "@/features/config/server";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "View Submission - Endatix",
  description: "View your submission",
  generator: "Endatix",
  keywords: ["endatix", "view", "submission", "form"],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
  robots: ROBOTS.hiddenPage,
};

export default async function ViewLayout({
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
      <body>
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
