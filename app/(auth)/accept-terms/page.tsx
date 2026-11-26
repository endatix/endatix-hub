import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { RetryStatus } from "@/features/auth/required-actions/retry-status";
import { declineTerms } from "@/features/legal/decline-terms.action";
import { OperatorContact } from "@/features/legal/operator-contact";
import { Button } from "@/components/ui/button";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { workspaceDestination } from "@/lib/routes/terms-journey";
import { acceptTerms } from "@/features/legal/accept-terms.action";
import { ConsentForm } from "@/features/legal/consent-form";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import {
  type Journey,
  pendingTerms,
  resumeWorkspace,
  signedInToken,
  termsStanding,
} from "@/features/legal/terms-standing.server";

export const metadata = { title: "Review the Terms" };

export default async function TermsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Journey & { updated?: string }> }>) {
  if (!(await termsAcceptanceEnabled())) redirect("/required-actions");
  const standing = await termsStanding(await signedInToken());
  if (!standing) return <RetryStatus />;
  const params = await searchParams;
  if (!pendingTerms(standing)) resumeWorkspace(standing, params);
  const returnUrl = workspaceDestination(
    params.scope === standing.scope ? params.returnUrl : undefined,
  );
  const terms = await readPublication("terms");
  if (!terms) return <RetryStatus />;
  const submit = acceptTerms.bind(null, {
    versionId: terms.versionId,
    scope: standing.scope,
    returnUrl,
  });
  return (
    <Reader terms={terms} submit={submit} updated={params.updated === "1"} />
  );
}

interface ReaderProps {
  terms: NonNullable<Awaited<ReturnType<typeof readPublication>>>;
  submit: (form: FormData) => Promise<string>;
  updated: boolean;
}

function Reader({ terms, submit, updated }: Readonly<ReaderProps>) {
  return (
    <section className="grid max-h-[85dvh] gap-4 overflow-y-auto px-1">
      <AuthLogo />
      <h1 className="text-2xl font-semibold">Review the Terms</h1>
      {updated && (
        <p role="status">
          The Terms changed. Review the current version before continuing.
        </p>
      )}
      <p>Version {terms.number}</p>
      <LegalMarkdown text={terms.markdown} />
      <Link href="/accept-terms/privacy" target="_blank">
        Read the Privacy notice (opens in a new tab)
      </Link>
      <ConsentForm key={terms.versionId} submit={submit} />
      <Decline />
    </section>
  );
}

function Decline() {
  return (
    <>
      <form action={declineTerms}>
        <Button variant="outline">Decline and sign out</Button>
      </form>
      <OperatorContact />
    </>
  );
}
