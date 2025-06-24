import "@/app/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { AppProvider } from "@/components/providers";
import { getSession } from "@/features/auth";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Endatix Hub",
  description: "Your data on your terms",
};

interface RootLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  nav: React.ReactNode;
}

export default async function RootLayout({ children, header, nav }: RootLayoutProps) {
  const session = await getSession();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
            {nav}
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
              {header}
              <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {children}
              </main>
            </div>
          </div>
          <Toaster expand={false} duration={Infinity} visibleToasts={5} />
        </AppProvider>
      </body>
    </html>
  );
}
