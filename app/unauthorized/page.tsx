import { auth } from "@/auth";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { Button } from "@/components/ui/button";
import { SIGNIN_PATH, SIGNOUT_PATH } from "@/features/auth";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "403 - Access Denied",
  description: "You don't have permission to access this page.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description: "You don't have permission to access this page.",
    images: [
      {
        url: "/assets/endatix-og-image.jpg",
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UnauthorizedPage() {
  const session = await auth();
  const isLoggedIn = !!session;

  if (!isLoggedIn) {
    redirect(SIGNIN_PATH);
  }

  return (
    <UnauthorizedComponent>
      <Button variant="default" asChild>
        <Link href={SIGNOUT_PATH}>Sign out</Link>
      </Button>
    </UnauthorizedComponent>
  );
}
