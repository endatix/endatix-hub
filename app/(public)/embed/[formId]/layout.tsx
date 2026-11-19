import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import { brandTitle, getRespondentBrand } from "@/lib/branding/server";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  robots: ROBOTS.hiddenPage,
};

/** Respondent pages keep the built-in look (`getRespondentBrand()`); the title and "Powered by" follow the deployment. */
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...metadata,
    title: await brandTitle("Form", "Endatix Form"),
  };
}

export default async function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, endatixConfig] = await Promise.all([
    auth(),
    getClientEndatixConfig(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      {/* No globals.css (DESIGN.md §9) — zero UA body margin or the iframe shows an 8px gutter. */}
      <body style={{ margin: 0 }}>
        <AppProvider
          options={AppOptions.PublicPages}
          session={session}
          endatixConfig={endatixConfig}
          brand={await getRespondentBrand()}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
