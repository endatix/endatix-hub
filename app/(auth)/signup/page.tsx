import { signupIntro } from "@/features/tenants/signup-request/signup-intro";
import { SignupRequestForm } from "@/features/tenants/signup-request/ui/signup-request-form";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import type { Metadata } from "next";
import { getBrand, isBuiltInBrand } from "@/lib/branding/server";
import { notFound } from "next/navigation";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { publicLegalLinks } from "@/features/legal/public-links.server";
import { SignupTerms } from "@/features/legal/signup-terms";

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

  const [description, legal] = await Promise.all([intro(), publicLegalLinks()]);
  if (legal.unavailable)
    return (
      <>
        <p role="status">The Terms are temporarily unavailable.</p>
        <RetryRequest />
      </>
    );
  return (
    <SignupRequestForm intro={description}>
      <SignupTerms legal={legal} />
    </SignupRequestForm>
  );
}
