import { auth } from "@/auth";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { Button } from "@/components/ui/button";
import { SIGNIN_PATH, SIGNOUT_PATH } from "@/features/auth";
import { Metadata } from "next";
import { brandAuthors, brandMetadata, getBrand } from "@/lib/branding/server";
import { ROBOTS } from "@/lib/seo";
import Link from "next/link";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    ...(await brandMetadata({
      description: "You don't have permission to access this page.",
    })),
    title: "403 - Access Denied",
    authors: brandAuthors(brand),
    robots: ROBOTS.hiddenPage,
  };
}

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
