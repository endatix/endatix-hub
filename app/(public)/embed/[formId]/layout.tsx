import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-provider";
import { getSession } from "@/features/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Endatix Form",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EmbedLayout({
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
      <body>
        <AppProvider options={AppOptions.NoTheme} session={session}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
