import { notFound } from "next/navigation";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";

export const metadata = { title: "Privacy notice" };

export default async function PrivacyPage() {
  if (!(await termsAcceptanceEnabled())) notFound();
  const notice = await readPublication("privacy");
  if (!notice.document)
    return (
      <>
        <p role="status">{notice.error}</p>
        <RetryRequest />
      </>
    );
  return (
    <section className="max-h-[85dvh] space-y-4 overflow-y-auto px-1">
      <h1 className="text-2xl font-semibold">Privacy notice</h1>
      <LegalMarkdown text={notice.document.markdown} />
    </section>
  );
}
