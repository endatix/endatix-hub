import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MobileJwtTestForm from "./mobile-jwt-test-form";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
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
