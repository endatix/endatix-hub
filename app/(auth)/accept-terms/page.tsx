import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { confirmedScope, workspaceScope } from "@/lib/routes/workspace-scope.server";
import { workspaceDestination } from "@/lib/routes/terms-journey";
import { declineTerms } from "@/features/legal/decline-terms.action";
import { OperatorContact } from "@/features/legal/operator-contact";
import { Button } from "@/components/ui/button";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { acceptTerms } from "@/features/legal/accept-terms.action";
import { ConsentForm } from "@/features/legal/consent-form";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import {
  type Journey,
  pendingTerms,
  resumeWorkspace,
  scopedDestination,
  signedInToken,
  termsStanding,
} from "@/features/legal/terms-standing.server";

export const metadata = { title: "Review the Terms" };

export default async function TermsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Journey & { updated?: string }> }>) {
  if (!(await termsAcceptanceEnabled())) redirect("/required-actions");
  const token = await signedInToken();
  const decline = declineTerms.bind(null, workspaceScope(token));
  const standing = await termsStanding(token);
  if (!standing) return <Unavailable decline={decline} />;
  const params = await searchParams;
  const journey = confirmedJourney(params, token) ?? params;
  if (!pendingTerms(standing)) resumeWorkspace(standing, journey);
  const returnUrl = scopedDestination(standing, journey);
  const terms = await readPublication("terms");
  if (!terms.document)
    return <Unavailable message={terms.error} decline={decline} />;
  const scope = params.scope === standing.homeScope ? standing.homeScope : standing.scope;
  const submit = acceptTerms.bind(null, {versionId: terms.document.versionId, scope, returnUrl});
  return <Reader terms={terms.document} submit={submit} decline={decline} updated={params.updated === "1"} />;
}

function confirmedJourney(params: Journey, token: string): Journey | undefined {
  const returnUrl = workspaceDestination(params.returnUrl);
  if (params.scope === confirmedScope(token, returnUrl)) return {scope:workspaceScope(token), returnUrl};
}

interface ReaderProps {
  terms: NonNullable<Awaited<ReturnType<typeof readPublication>>["document"]>;
  submit: (form: FormData) => Promise<string>;
  decline: () => Promise<void>;
  updated: boolean;
}

function Reader({ terms, submit, updated, decline }: Readonly<ReaderProps>) {
  return (
    <section
      aria-label="Terms review"
      tabIndex={0}
      className="grid max-h-[85dvh] gap-4 overflow-y-auto px-1"
    >
      <AuthLogo />
      <h1 className="text-2xl font-semibold">Review the Terms</h1>
      {updated && <ChangedVersion />}
      <p>Version {terms.number}</p>
      <LegalMarkdown text={terms.markdown} />
      <Link href="/accept-terms/privacy" target="_blank" className="text-primary underline">
        Read the Privacy notice (opens in a new tab)
      </Link>
      <ConsentForm key={terms.versionId} submit={submit} decline={decline} />
      <OperatorContact />
    </section>
  );
}

function ChangedVersion() {
  return <p role="status">The Terms changed. Review the current version before continuing.</p>;
}

function Unavailable({
  message = "Your account status is temporarily unavailable.",
  decline,
}: Readonly<{ message?: string; decline: () => Promise<void> }>) {
  return (
    <>
      <p role="status">{message}</p>
      <RetryRequest />
      <form action={decline}>
        <Button variant="outline">Decline and sign out</Button>
      </form>
      <OperatorContact />
    </>
  );
}
