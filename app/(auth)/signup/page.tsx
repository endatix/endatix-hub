import { SignupRequestForm } from "@/features/tenants/signup-request/ui/signup-request-form";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import type { Metadata } from "next";
import { brandMetadata, getBrand, withIndefiniteArticle } from "@/lib/branding/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    ...(await brandMetadata({
      title: "Sign up",
      description: `Request access to ${withIndefiniteArticle(brand.shortName)} workspace.`,
    })),
  };
}

export default async function SignupPage() {
  const enabled = await saasManagementFlag();
  if (!enabled) {
    notFound();
  }

  return <SignupRequestForm />;
}
