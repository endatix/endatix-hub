import "@/app/globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BrandProvider } from "@/lib/branding/brand-provider";
import { brandLayoutMetadata, getBrand } from "@/lib/branding/server";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";

export const generateMetadata = () => brandLayoutMetadata({ titleTemplate: true });

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const brand = await getBrand();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-muted/35 text-foreground`}>
        <BrandProvider brand={brand}><ThemeProvider>{children}</ThemeProvider></BrandProvider>
      </body>
    </html>
  );
}
