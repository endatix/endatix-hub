import { notFound } from "next/navigation";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";

export const metadata = { title: "Terms" };

export default async function PublicTermsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ version?: string }> }>) {
  if (!(await termsAcceptanceEnabled())) notFound();
  const terms = await readPublication("terms");
  if (!terms.document)
    return <><p role="status">{terms.error}</p><RetryRequest /></>;
  const { version } = await searchParams;
  if (version && terms.document.versionId !== version) {
    return <p role="status">The Terms have changed. Reload the signup form to review the current version.</p>;
  }
  return (
    <section aria-label="Published Terms" className="space-y-4">
      <h1 className="text-2xl font-semibold">Terms</h1>
      <p>Version {terms.document.number}</p>
      <LegalMarkdown text={terms.document.markdown} />
    </section>
  );
}
