import "@/app/globals.css";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { brandMetadata } from "@/lib/branding/server";
import { getMetadataBase } from "@/lib/seo";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await brandMetadata({
      title: "404 - Page Not Found",
      builtInTitle: "404 - Page Not Found",
    })),
    metadataBase: getMetadataBase(),
    description: "The page you are looking for does not exist.",
    generator: "Endatix",
    keywords: [
      "endatix",
      "endatix hub",
      "endatix hub app",
      "forms-management",
      "ai-form-builder",
    ],
  };
}

/**
 * Unmatched routes skip every layout. Import Hub styles here (Next.js global-not-found).
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-content-canvas text-foreground antialiased`}
      >
        <div className="flex min-h-screen w-full items-center justify-center px-4">
          <NotFoundComponent
            notFoundTitle="Page not found"
            notFoundSubtitle="We couldn't find that page."
            notFoundMessage="Check the URL and try again."
          >
            <Button asChild size="lg">
              <Link href="/">Back to Hub</Link>
            </Button>
          </NotFoundComponent>
        </div>
      </body>
    </html>
  );
}
