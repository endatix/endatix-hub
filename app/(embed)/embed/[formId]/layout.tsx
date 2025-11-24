import { AppProvider } from "@/components/providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Endatix Form",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <AppProvider
          options={{
            enableTheme: false,
            enableAnalytics: false,
            enableSession: false,
            enableToaster: false,
          }}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
