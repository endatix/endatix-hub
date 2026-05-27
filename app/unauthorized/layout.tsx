import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Endatix Hub - Error",
  description: "An error occurred while loading the page.",
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
  robots: {
    index: false,
    follow: false,
  },
};

interface UnauthorizedLayoutProps {
  children: React.ReactNode;
}

export default async function UnauthorizedLayout({
  children,
}: UnauthorizedLayoutProps) {
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          <div className="flex min-h-screen w-full flex-row bg-muted/40">
            <main className="flex flex-1 flex-col p-6">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
