import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import Image from "next/image";
import { Metadata } from "next";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Endatix Hub - Login",
  description: "Login to your Endatix Hub account",
  generator: "Endatix",
  keywords: [
    "endatix",
    "endatix hub",
    "endatix hub app",
    "forms-management",
    "ai-form-builder",
    "login",
  ],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider session={session}>
          <div className="h-screen w-full overflow-hidden bg-muted/40">
            <main className="grid h-full p-6 lg:grid-cols-2">
              <div className="flex items-center justify-center">
                <div className="w-[400px] space-y-6">{children}</div>
              </div>
              <div className="hidden items-center justify-center lg:flex">
                <Image
                  src="/assets/lines-and-stuff.svg"
                  alt="Lines and dots pattern"
                  width="600"
                  height="600"
                  className="h-[60%] max-h-full w-auto max-w-full object-contain dark:brightness-[0.6] dark:grayscale"
                />
              </div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
