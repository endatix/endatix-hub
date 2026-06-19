import { Metadata } from "next";
import ResetPasswordForm, {
  InvalidResetLinkMessage,
} from "./reset-password-form";
import { ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your password",
  robots: ROBOTS.hiddenPage,
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    email: string;
    resetCode: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { email, resetCode } = await searchParams;

  if (!email || !resetCode) {
    return <InvalidResetLinkMessage />;
  }

  return <ResetPasswordForm email={email} resetCode={resetCode} />;
}
