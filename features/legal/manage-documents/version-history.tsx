import { VersionPager } from "./version-pager";
import type { IPagedRequest } from "@/lib/endatix-api/shared/types";
import type { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { HubPageLoadError } from "@/components/error-handling/error-page/hub-page-load-error";
import { LegalMarkdown } from "../legal-markdown";
import { readVersions } from "./version-history.server";
import type { DocumentKind, Publication } from "./documents";

interface Props {
  api: EndatixApi;
  kind: DocumentKind;
  paging: IPagedRequest;
}
export async function VersionHistory({ api, kind, paging }: Readonly<Props>) {
  const result = await readVersions(api, kind, paging);
  if (Result.isError(result)) return <HubPageLoadError result={result} />;
  const {items, ...counts} = result.value;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Version history</h2>
      {items.length === 0 && <p>No versions on this page.</p>}
      {items.map((version) => <Version key={version.id} version={version} />)}
      <VersionPager counts={counts} />
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
