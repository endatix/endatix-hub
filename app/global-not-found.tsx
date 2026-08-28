import "@/app/globals.css";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import { getMetadataBase } from "@/lib/seo";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
  generator: "Endatix",
  keywords: [
    "endatix",
    "endatix hub",
    "endatix hub app",
    "forms-management",
    "ai-form-builder",
  ],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
};

/**
 * Unmatched routes skip every layout. Import Hub styles here (Next.js global-not-found).
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function GlobalNotFound() {
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-content-canvas text-foreground antialiased`}
      >
        <div className="flex min-h-screen items-center justify-center px-4">
          <NotFoundComponent
            notFoundTitle="404"
            notFoundSubtitle="The page you are looking for does not exist."
            notFoundMessage="Please check the URL and try again."
          >
            <Button asChild>
              <Link href="/">Back to Hub</Link>
            </Button>
          </NotFoundComponent>
        </div>
      </body>
    </html>
  );
}
