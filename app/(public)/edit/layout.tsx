import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { getClientEndatixConfig } from "@/features/config";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Edit Submission - Endatix",
  description: "Edit your submission",
  generator: "Endatix",
  keywords: ["endatix", "edit", "submission", "form"],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
  robots: ROBOTS.hiddenPage,
};

export default async function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const endatixConfig = await getClientEndatixConfig();
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
        <AppProvider session={session} endatixConfig={endatixConfig}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
