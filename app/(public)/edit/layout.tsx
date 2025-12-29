import "@/app/globals.css";
import { AppProvider } from "@/components/providers";
import { getSession } from "@/features/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Submission - Endatix",
  description: "Edit your submission",
  generator: "Endatix",
  keywords: [
    "endatix",
    "edit",
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

export default async function EditLayout({
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
