import "@/app/globals.css";
import { AppProvider } from "@/components/providers";
import { getOsClass } from "@/lib/utils/next-utils";
import { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";

const geistSans = localFont({
  src: "../../../public/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const appOptions = {
  enableTheme: true,
  enableAnalytics: false,
  enableSession: false,
  enableToaster: false,
  enableSidebar: false,
};

export const metadata: Metadata = {
  title: "Endatix",
  description: "Customizable form management platform",
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const osClass = getOsClass(requestHeaders);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${osClass}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <AppProvider options={appOptions}>{children}</AppProvider>
      </body>
    </html>
  );
}
