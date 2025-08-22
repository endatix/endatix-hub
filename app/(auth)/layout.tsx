import "@/app/globals.css";
import Image from "next/image";
import localFont from "next/font/local";
import { getSession } from "@/features/auth";
import { AppProvider } from "@/components/providers";

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

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getSession();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          <div className="h-screen w-full bg-muted/40 overflow-hidden">
            <main className="h-full grid lg:grid-cols-2 p-6">
              <div className="flex items-center justify-center">
                <div className="w-[400px] space-y-6">{children}</div>
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <Image
                  src="/assets/lines-and-stuff.svg"
                  alt="Lines and dots pattern"
                  width="600"
                  height="600"
                  className="w-auto h-[60%] max-w-full max-h-full object-contain dark:brightness-[0.6] dark:grayscale"
                />
              </div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
