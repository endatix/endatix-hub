import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-provider";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Submission - Endatix",
  description: "View your submission",
  generator: "Endatix",
  keywords: ["endatix", "view", "submission", "form"],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ViewLayout({
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
        <AppProvider options={AppOptions.PublicPages} session={session}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
