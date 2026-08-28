"use client";

import "@/app/globals.css";
import { UnexpectedErrorView } from "@/components/error-handling/error-page";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/**
 * The global error page is shown when an error occurs.
 * It is displayed when the server encounters an error that is not handled by the application.
 * It is also displayed when the client encounters an error that is not handled by the application.
 * @param param0 - The error and retry function.
 * @returns The global error page.
 */
export default function GlobalError({
  error,
  retry,
}: Readonly<GlobalErrorProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong | Endatix Hub</title>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-content-canvas text-foreground antialiased`}
      >
        <div className="flex min-h-screen items-center justify-center px-4">
          <UnexpectedErrorView error={error} retry={retry} />
        </div>
      </body>
    </html>
  );
}
