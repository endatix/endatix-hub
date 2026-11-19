"use client";

import "@/app/globals.css";
import { UnexpectedErrorView } from "@/components/error-handling/error-page";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { withBasePath } from "@/lib/hosting";
import { useEffect, useState } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

const TITLE = "Something went wrong";

/**
 * The deployment brand's name, from the Hub's `/brand/name` alias: this client
 * root replaces every layout, so it cannot read the brand on the server, and
 * the alias needs no API. Null until it answers, or when it cannot.
 */
function useBrandName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(withBasePath("/brand/name"))
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => {
        if (active && text) setName(text);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return name;
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
  const brandName = useBrandName();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{brandName ? `${TITLE} | ${brandName}` : TITLE}</title>
        <link rel="icon" href={withBasePath("/brand/icon")} />
        <link rel="stylesheet" href={withBasePath("/brand/brand.css")} />
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
