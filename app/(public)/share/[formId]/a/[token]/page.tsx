import { OpenPersonalLink } from "@/features/public-form/open-personal-link/ui/open-personal-link";
import type { Metadata } from "next";

type PersonalLinkPageProps = {
  params: Promise<{ formId: string; token: string }>;
};

/** The token is in the path: no Referer carries it to a site the survey links to. */
export const metadata: Metadata = { referrer: "no-referrer" };

/**
 * A personalized link. The GET only renders; the link is redeemed by POST once the page has
 * loaded in a browser, so a mail scanner's fetch changes nothing (endatix-hub#1211).
 */
export default async function PersonalLinkPage({
  params,
}: Readonly<PersonalLinkPageProps>) {
  const { formId, token } = await params;
  return <OpenPersonalLink formId={formId} token={token} />;
}
