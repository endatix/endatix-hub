import { signupIntro } from "@/features/tenants/signup-request/signup-intro";
import { SignupRequestForm } from "@/features/tenants/signup-request/ui/signup-request-form";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import type { Metadata } from "next";
import { getBrand, isBuiltInBrand } from "@/lib/branding/server";
import { notFound } from "next/navigation";

async function intro(): Promise<string> {
  const brand = await getBrand();
  return signupIntro(brand, isBuiltInBrand(brand));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign up",
    description: await intro(),
  };
}

export default async function SignupPage() {
  const enabled = await saasManagementFlag();
  if (!enabled) {
    notFound();
  }

  return <SignupRequestForm intro={await intro()} />;
}
