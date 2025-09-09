import type { Metadata } from "next";
import { getSession } from "@/features/auth";
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
import { authPresentation } from "@/auth";
import {
  AuthPresentation,
  ENDATIX_AUTH_PROVIDER_ID,
  RETURN_URL_PARAM,
} from "@/features/auth/infrastructure";
import SigninForm from "@/features/auth/use-cases/signin/ui/signin-form";

export const metadata: Metadata = {
  title: "Sign in | Endatix Hub",
  description: "Sign in the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description: "Sign in the Endatix Hub form management portal.",
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

interface SignInPageProps {
  searchParams: Promise<{
    [RETURN_URL_PARAM]: string | undefined;
  }>;
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const { returnUrl } = await searchParams;
  const user = await getSession();

  if (user.isLoggedIn) {
    return (
      <LoggedInSuccessMessage
        username={user.username}
        isLoggedIn={user.isLoggedIn}
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
    return <div>No Endatix auth provider found</div>;
  }

  return (
    <>
      <SigninForm
        endatixAuthProvider={endatixAuthProvider}
        externalAuthProviders={externalAuthProviders}
        returnUrl={returnUrl}
      />
      {/* <NewAccountLink /> */}
    </>
  );
};

interface LoggedInMessageProps {
  username: string;
  isLoggedIn: boolean;
}

const LoggedInSuccessMessage = ({
  username,
  isLoggedIn,
}: LoggedInMessageProps) => {
  if (isLoggedIn)
    return (
      <Card className="bg-background">
        <CardHeader className="pb-3">
          <CardTitle>Welcome!</CardTitle>
          <CardDescription className="max-w-lg text-balance leading-relaxed">
            You are now logged in as {username}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Click on the button below to continue</p>
        </CardContent>
        <CardFooter>
          <Link href="/">
            <Button className="mr-8">
              <Rocket className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
};

export default SignInPage;
