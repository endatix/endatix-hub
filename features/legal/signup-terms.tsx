import { LegalMarkdown } from "./legal-markdown";
import { DocumentLink } from "./document-link";
import type { publicLegalLinks } from "./public-links.server";

export function SignupTerms({
  legal,
}: Readonly<{ legal: Awaited<ReturnType<typeof publicLegalLinks>> }>) {
  if (!legal.required) return null;
  const { number, versionId, markdown } = legal.required;
  return (
    <div className="grid gap-2 text-sm" key={versionId}>
      <details>
        <summary className="cursor-pointer underline">Read the Terms (version {number})</summary>
        <LegalMarkdown text={markdown} />
      </details>
      <label className="flex items-start gap-2">
        <input type="checkbox" required name="acceptedTermsVersionId" value={versionId} />
        I agree to the Terms (version {number}).
      </label>
      <DocumentLink href={`${legal.terms}?version=${versionId}`} newTab>Open these Terms</DocumentLink>
      <DocumentLink href={legal.privacy} newTab>Read the Privacy notice</DocumentLink>
    </div>
  );
}
