import Link from "next/link";
import type { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { HubPageLoadError } from "@/components/error-handling/error-page/hub-page-load-error";
import { LegalMarkdown } from "../legal-markdown";
import { readVersions } from "./version-history.server";
import type { DocumentKind, Publication } from "./documents";

interface Props {
  api: EndatixApi;
  kind: DocumentKind;
  page: number;
}
export async function VersionHistory({ api, kind, page }: Readonly<Props>) {
  const result = await readVersions(api, kind, page);
  if (Result.isError(result)) return <HubPageLoadError result={result} />;
  const versions = result.value;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Version history</h2>
      {versions.items.length === 0 && <p>No versions on this page.</p>}
      {versions.items.map((version) => <Version key={version.id} version={version} />)}
      <nav aria-label="Version history pages" className="flex gap-4">
        {page > 1 && (
          <Link href={{ pathname: "/admin/legal", query: { kind, page: page - 1 } }}>Previous versions page</Link>
        )}
        {versions.hasNextPage && (
          <Link href={{ pathname: "/admin/legal", query: { kind, page: page + 1 } }}>Next versions page</Link>
        )}
      </nav>
    </section>
  );
}

function Version({ version }: Readonly<{ version: Publication }>) {
  return (
    <details className="rounded-md border p-3">
      <summary>
        Version {version.number} · {version.change} · published by user {version.publishedByUserId} on{" "}
        <time dateTime={version.publishedAt}>{version.publishedAt}</time>
      </summary>
      <LegalMarkdown text={version.markdown} />
    </details>
  );
}
