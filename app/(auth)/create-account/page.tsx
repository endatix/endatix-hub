import CreateAccountForm from "@/features/auth/use-cases/create-account/ui/create-account-form";
import { Metadata } from "next";
import SignInLink from "@/features/auth/use-cases/create-account/ui/sign-in-link";
import { getSession, SessionData } from "@/features/auth";
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
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Create account | Endatix Hub",
  description:
    "Create a new account in the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description:
      "Create a new account in the Endatix Hub form management portal.",
    images: [
      {
        url: "/assets/endatix-og-image.jpg",
      },
    ],
  },
};

const CreateAccountPage = async () => {
  const user = await getSession();

  const shouldRedirectUser = async (user: SessionData): Promise<boolean> => {
    if (!user || !user.isLoggedIn) {
      return false;
    }

    const headersList = await headers();
    const referer = headersList.get("referer");
    if (!referer) {
      return false;
    }

    const refererUrl = new URL(referer);
    const isOriginatingFromCreateAccountPage =
      refererUrl.pathname === "/create-account";
    if (!isOriginatingFromCreateAccountPage) {
      return false;
    }

    return true;
  };

  if (await shouldRedirectUser(user)) {
    redirect("/forms");
  }

  if (user.isLoggedIn) {
    return (
      <LoggedInSuccessMessage
        username={user.username}
        isLoggedIn={user.isLoggedIn}
      />
    );
  }

  return (
    <>
      <CreateAccountForm />
      <SignInLink />
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

export default CreateAccountPage;
