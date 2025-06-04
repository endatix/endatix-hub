import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/app/globals.css";
import { Toaster } from "sonner";
import { AppProvider } from "@/components/providers";
import { getSession } from "@/features/auth";

const geistSans = localFont({
  src: "../../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Endatix Hub - Authentication",
  description: "Sign in or create your Endatix Hub account",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          {children}
          <Toaster expand={false} duration={Infinity} visibleToasts={5} />
        </AppProvider>
      </body>
    </html>
  );
}
