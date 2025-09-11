import { Button } from "@/components/ui/button";
import { SIGNIN_PATH } from "@/features/auth/infrastructure/auth-constants";
import { XCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import AuthErrorDetails from "@/features/auth/ui/auth-error";
import { AuthErrorType, ErrorDetails } from "@/features/auth";

export const metadata: Metadata = {
  title: "Authentication failed | Endatix Hub",
  description: "Authentication failed the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description:
      "Authentication failed the Endatix Hub form management portal.",
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

const defaultErrorDetails: ErrorDetails = {
  message:
    "There was a problem when trying to authenticate. Please contact us if this error persists.",
  code: "Unknown",
};

const errorMap = {
  [AuthErrorType.Configuration]: {
    message:
      "There was a problem when trying to authenticate. Please contact us if this error persists.",
    code: "Configuration",
  },
  [AuthErrorType.Network]: {
    message:
      "There was a problem when trying to connect Endatix API. Please try again later and contact us if the problem persists.",
    code: "Network",
  },
  [AuthErrorType.Server]: {
    message:
      "There was an unexpected error when trying to authenticate. Please try again and contact us if the issue persists.",
    code: "Server",
  },
  [AuthErrorType.Unknown]: {
    message:
      "There was an unexpected error when trying to authenticate. Please try again and contact us if the issue persists.",
    code: "Unknown",
  },
};

interface AuthErrorPageProps {
  searchParams: Promise<{
    error: string | undefined;
  }>;
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;
  let errorDetatails = defaultErrorDetails;
  if ((error as AuthErrorType) in errorMap) {
    errorDetatails = errorMap[error as AuthErrorType];
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="flex items-center justify-center gap-3 mb-2">
        <XCircle className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Authentication failed
        </h1>
      </div>
      <AuthErrorDetails errorDetatails={errorDetatails} />
      <Button variant="default" asChild>
        <Link href={SIGNIN_PATH}>Go to sign in</Link>
      </Button>
    </div>
  );
}
