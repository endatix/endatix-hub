import "@/app/globals.css";
import { AppProvider } from "@/components/providers";
import { getSession } from "@/features/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Submission - Endatix",
  description: "View your submission",
  generator: "Endatix",
  keywords: [
    "endatix",
    "view",
    "submission",
    "form"
  ],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ViewLayout({
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
        <AppProvider session={session}>{children}</AppProvider>
      </body>
    </html>
  );
}
