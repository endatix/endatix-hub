import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import {
  BarChart2,
  Database,
  FileText,
  PenLine,
  Send,
  Users,
} from "lucide-react";
import { Instrument_Sans } from "next/font/google";
import { Metadata } from "next";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  weight: ["400", "500", "600", "700"],
});

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Endatix Hub",
  description: "Login to your Endatix Hub account",
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
};

const formFeatures = [
  { icon: PenLine, label: "Form Builder" },
  { icon: FileText, label: "Templates" },
  { icon: Send, label: "Submissions" },
  { icon: BarChart2, label: "Analytics" },
  { icon: Database, label: "Data Storage" },
  { icon: Users, label: "Respondents" },
];

export default async function AuthLayout({ children }: AuthLayoutProps) {
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable}`}
      >
        <AppProvider session={session}>
          <div className="h-screen w-full overflow-hidden bg-muted/40">
            <a
              href="https://endatix.com"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed right-8 bottom-8 z-50 text-sm text-primary/70 transition-colors duration-200 hover:text-primary"
            >
              endatix.com
            </a>
            <main className="grid h-full gap-8 p-6 lg:grid-cols-2">
              {/* Left — sign-in form */}
              <div className="flex items-center justify-center">
                <div className="w-[400px] space-y-6">{children}</div>
              </div>

              {/* Right — hero panel */}
              <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
                <div
                  className="pointer-events-none absolute inset-0 bg-grid"
                  aria-hidden="true"
                />

                {/* Radial glow behind content */}
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="h-72 w-[560px] rounded-full blur-[72px] dark:bg-primary/[0.14]" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
                  <h2 className="font-[family-name:var(--font-instrument-sans)] text-4xl leading-tight font-semibold tracking-tight text-primary xl:text-5xl">
                    Form Management Platform
                  </h2>
                  <p className="inline-block rounded-full border border-primary/35 bg-background/60 px-5 py-1.5 text-sm leading-relaxed text-muted-foreground backdrop-blur-sm dark:border-primary/30">
                    Build, collect, and analyze your form and survey data.
                  </p>

                  <div className="grid grid-cols-3 gap-3 xl:grid-cols-6 xl:gap-3">
                    {formFeatures.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-container-low px-4 py-4 xl:px-3 dark:border-primary/[0.18]"
                      >
                        <div className="rounded-full bg-primary/[0.08] p-2.5 dark:bg-primary/[0.14]">
                          <Icon
                            className="h-4 w-4 text-primary/55 dark:text-primary/65"
                            strokeWidth={1.5}
                          />
                        </div>
                        <span className="text-xs leading-tight font-medium whitespace-nowrap text-muted-foreground">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
