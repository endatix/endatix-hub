import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify your email | Endatix Hub",
  description: "Verify your email address to complete your account creation.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
};

const SendVerificationPage = ({
  searchParams,
}: {
  searchParams: { email?: string };
}) => {
  const email = searchParams.email;

  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              This page requires a valid email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create-account">
              <Button>Back to Create Account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Account Created Successfully!</CardTitle>
          <CardDescription>
            An account has been created with the email: {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Please check your email for verification instructions.
          </p>
          <Link href="/login">
            <Button>
              <Rocket className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendVerificationPage;
