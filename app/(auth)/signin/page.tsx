import type { Metadata } from "next";
import { brandAuthors, getBrand } from "@/lib/branding/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth, authPresentation } from "@/auth";
import {
  AuthPresentation,
  ENDATIX_AUTH_PROVIDER_ID,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure";
import SigninForm from "@/features/auth/use-cases/signin/ui/signin-form";
import { signinDestination } from "@/features/auth/use-cases/signin/signin-destination";
import { DeclinedNotice } from "@/features/legal/operator-contact";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: "Sign in",
    description: `Sign in the ${brand.name} form management portal.`,
    authors: brandAuthors(brand),
  };
}

interface SignInPageProps {
  searchParams: Promise<{
    [RETURN_URL_PARAM]: string | undefined;
    callbackUrl?: string;
  }>;
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const returnUrl = signinDestination(await searchParams);
  const authSession = await auth();

  if (authSession?.user && !authSession.error) {
    return (
      <SignedInSuccessMessage
        username={authSession.user.name ?? authSession.user.email ?? ""}
        isSignedIn={!!authSession.user}
      />
    );
  }

  let endatixAuthProvider: AuthPresentation | undefined;
  const externalAuthProviders: AuthPresentation[] = [];
  for (const provider of authPresentation) {
    if (provider.id === ENDATIX_AUTH_PROVIDER_ID) {
      endatixAuthProvider = provider;
    } else {
      externalAuthProviders.push(provider);
    }
  }

  if (!endatixAuthProvider) {
    const brand = await getBrand();
    return <div>No {brand.shortName} auth provider found</div>;
  }

  return (
    <>
      <SigninForm
        endatixAuthProvider={endatixAuthProvider}
        externalAuthProviders={externalAuthProviders}
        returnUrl={returnUrl}
      />
      <DeclinedNotice />
    </>
  );
};

interface SignedInMessageProps {
  username: string;
  isSignedIn: boolean;
}

const SignedInSuccessMessage = ({
  username,
  isSignedIn,
}: SignedInMessageProps) => {
  if (isSignedIn)
    return (
      <div className="flex flex-col gap-2">
        <Card className="bg-background">
          <CardHeader className="pb-3">
            <CardTitle>Welcome!</CardTitle>
            <CardDescription className="max-w-lg leading-relaxed text-balance">
              You are now signed in as {username}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Let’s start creating forms!</p>
          </CardContent>
          <CardFooter>
            <Link href="/forms">
              <Button className="mr-8">
                <Rocket className="h-4 w-4" />
                Go to Forms
              </Button>
            </Link>
          </CardFooter>
        </Card>
        <p className="max-w-lg px-6 text-sm leading-relaxed text-balance text-muted-foreground">
          Or{" "}
          <Link href="/signout" className="text-primary underline">
            sign out
          </Link>{" "}
          if you wish to use a different account.
        </p>
      </div>
    );
};

export default SignInPage;
