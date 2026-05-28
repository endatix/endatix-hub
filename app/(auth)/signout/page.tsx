import { Metadata } from "next";
import SignoutButton from "@/features/auth/use-cases/signout/ui/signout-button";
import GoBackButton from "@/components/layout-ui/navigation/go-back-button";
import { getPublicAssetPath } from "@/lib/hosting";

export const metadata: Metadata = {
  title: "Sign out | Endatix Hub",
  description: "Sign out from the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description: "Sign out from the Endatix Hub form management portal.",
    images: [
      {
        url: getPublicAssetPath("/assets/endatix-og-image.jpg"),
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignOutPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="mt-2 text-2xl font-bold">Sign out of Endatix Hub?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can always sign in back in at any time.
      </p>
      <div className="mt-8 flex items-center justify-center gap-2 px-4 py-2 whitespace-nowrap">
        <SignoutButton />
        <GoBackButton variant="outline" text="Cancel" />
      </div>
    </div>
  );
}
