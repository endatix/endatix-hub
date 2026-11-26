import { footerLegalLinks } from "./public-links.server";
import { DocumentLink } from "./document-link";

export async function AuthFooter({ website }: Readonly<{ website?: string }>) {
  const { terms, privacy } = await footerLegalLinks();
  return (
    <footer className="flex flex-wrap justify-end gap-4 px-6 py-3 text-sm text-muted-foreground">
      <DocumentLink href={terms}>Terms</DocumentLink>
      <DocumentLink href={privacy}>Privacy notice</DocumentLink>
      {website?.startsWith("http") && (
        <a href={website} target="_blank" rel="noreferrer">
          {new URL(website).host}
        </a>
      )}
    </footer>
  );
}
