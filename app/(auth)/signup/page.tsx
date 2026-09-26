import { SignupRequestForm } from "@/features/tenants/signup-request/ui/signup-request-form";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAssetPath } from "@/lib/hosting";

export const metadata: Metadata = {
  title: "Sign up | Endatix Hub",
  description: "Create an account to get started.",
  openGraph: {
    description: "Create an account to get started.",
    images: [
      {
        url: getPublicAssetPath("/assets/endatix-og-image.jpg"),
      },
    ],
  },
};

export default async function SignupPage() {
  const enabled = await saasManagementFlag();
  if (!enabled) {
    notFound();
  }

  return <SignupRequestForm />;
}
