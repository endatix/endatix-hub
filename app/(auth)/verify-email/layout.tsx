import type { Metadata } from "next";
import { ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: ROBOTS.hiddenPage,
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
