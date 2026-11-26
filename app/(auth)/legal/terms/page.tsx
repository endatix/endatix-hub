import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicationStatus } from "../../publication-status";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";

export const metadata = { title: "Terms" };

function UpdatedTerms() {
  return <PublicationStatus title="The Terms have changed">
    <Link href="/legal/terms">Read the current Terms</Link>
    <Link href="/signup">Return to signup</Link>
  </PublicationStatus>;
}

export default async function PublicTermsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ version?: string }> }>) {
  if (!(await termsAcceptanceEnabled())) notFound();
  const terms = await readPublication("terms");
  if (!terms.document)
    return <PublicationStatus title={terms.error} />;
  const { version } = await searchParams;
  if (version && terms.document.versionId !== version) return <UpdatedTerms />;
  return (
    <section aria-label="Published Terms" className="space-y-4">
      <h1 className="text-2xl font-semibold">Terms</h1>
      <p>Version {terms.document.number}</p>
      <LegalMarkdown text={terms.document.markdown} />
    </section>
  );
}
