import { notFound } from "next/navigation";
import { RetryStatus } from "@/features/auth/required-actions/retry-status";
import { LegalMarkdown } from "@/features/legal/legal-markdown";
import { readPublication } from "@/features/legal/publication.server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";

export const metadata = { title: "Privacy notice" };

export default async function PrivacyPage() {
  if (!(await termsAcceptanceEnabled())) notFound();
  const notice = await readPublication("privacy");
  if (!notice) return <RetryStatus />;
  return (
    <section className="max-h-[85dvh] space-y-4 overflow-y-auto px-1">
      <h1 className="text-2xl font-semibold">Privacy notice</h1>
      <LegalMarkdown text={notice.markdown} />
    </section>
  );
}
