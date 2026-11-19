import { Metadata } from "next";
import { brandMetadata } from "@/lib/branding/server";
import SignoutButton from "@/features/auth/use-cases/signout/ui/signout-button";
import GoBackButton from "@/components/layout-ui/navigation/go-back-button";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import { ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await brandMetadata({
      title: "Sign out",
      description: "Sign out from the Endatix Hub form management portal.",
    })),
    authors: [
      {
        name: "Endatix Team",
        url: "https://endatix.com",
      },
    ],
    robots: ROBOTS.hiddenPage,
  };
}

export default function SignOutPage() {
  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="prompt"
        title="Sign out of Endatix Hub?"
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
