import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MobileJwtTestForm from "./mobile-jwt-test-form";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";
import { ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: ROBOTS.hiddenPage,
};

export default async function SessionBridgePage() {
  const enableExperimental = await experimentalFeaturesFlag();
  const allowSessionBridgePage =
    enableExperimental || process.env.NODE_ENV !== "production";
  if (!allowSessionBridgePage) {
    redirect("/signin");
  }

  return <MobileJwtTestForm />;
}
