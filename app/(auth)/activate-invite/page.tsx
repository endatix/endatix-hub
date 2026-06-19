import type { Metadata } from "next";
import {
  ActivateInviteForm,
  InvalidInviteLinkMessage,
} from "@/features/auth/use-cases/activate-invite";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export const metadata: Metadata = {
  title: "Accept Invitation | Endatix Hub",
  description: "Accept your Endatix Hub invitation and set your password.",
  robots: { index: false, follow: false },
};

interface ActivateInvitePageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ActivateInvitePage({
  searchParams,
}: Readonly<ActivateInvitePageProps>) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidInviteLinkMessage />;
  }

  const inviteDetails = await getInviteDetails(token);
  if (!Result.isSuccess(inviteDetails)) {
    return <InvalidInviteLinkMessage />;
  }

  return <ActivateInviteForm token={token} email={inviteDetails.value.email} />;
}

async function getInviteDetails(
  token: string,
): Promise<ResultType<{ email: string }>> {
  const endatix = new EndatixApi();
  const apiResult = await endatix.auth.getInviteDetails({ token });

  return toResult(apiResult, {
    fallbackMessage: "Could not load invitation details.",
    logMessage: "Failed to load invitation details.",
    loggerName: "activate-invite",
    mapData: (data) => ({ email: data.email }),
  });
}
