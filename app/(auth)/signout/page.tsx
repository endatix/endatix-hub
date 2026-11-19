import { Metadata } from "next";
import { brandAuthors, getBrand } from "@/lib/branding/server";
import SignoutButton from "@/features/auth/use-cases/signout/ui/signout-button";
import GoBackButton from "@/components/layout-ui/navigation/go-back-button";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import { ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: "Sign out",
    description: `Sign out from the ${brand.name} form management portal.`,
    authors: brandAuthors(brand),
    robots: ROBOTS.hiddenPage,
  };
}

export default async function SignOutPage() {
  const brand = await getBrand();
  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="prompt"
        title={`Sign out of ${brand.name}?`}
        description="You can sign back in at any time."
      >
        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
          <SignoutButton />
          <GoBackButton variant="outline" text="Cancel" />
        </div>
      </AuthStatus>
    </>
  );
}
