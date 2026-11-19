import { SignupRequestForm } from "@/features/tenants/signup-request/ui/signup-request-form";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import type { Metadata } from "next";
import { brandMetadata } from "@/lib/branding/server";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await brandMetadata({
      title: "Sign up",
      description: "Request access to an Endatix workspace.",
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
