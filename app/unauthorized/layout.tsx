import "@/app/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/components/providers";
import { getSession } from "@/features/auth";

const geistSans = localFont({
  src: "../../public/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          <div className="flex min-h-screen w-full flex-row bg-muted/40">
            <main className="flex-1 flex flex-col p-6">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
