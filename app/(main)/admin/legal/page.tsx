import Link from "next/link";
import { notFound } from "next/navigation";
import { PagedListFrame } from "@/components/table/paged-list-frame";
import { PagedListUrlProvider } from "@/components/table/paged-list-url-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { HubPageLoadError } from "@/components/error-handling/error-page/hub-page-load-error";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { documentApi, documentsPath, options } from "@/features/legal/manage-documents/document-api.server";
import { DocumentEditor } from "@/features/legal/manage-documents/document-editor";
import { documentKind, titles, type DocumentState } from "@/features/legal/manage-documents/documents";
import { VersionHistory } from "@/features/legal/manage-documents/version-history";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import { Result, toResult } from "@/lib/result";

interface Props {
  searchParams: Promise<{ kind?: string; page?: string; pageSize?: string }>;
}
export default async function LegalPage({ searchParams }: Readonly<Props>) {
  const api = await documentApi();
  if (!api) notFound();
  const query = await searchParams;
  const kind = parseKind(query.kind);
  const result = toResult(await api.get<DocumentState[]>(documentsPath), options);
  if (Result.isError(result)) return <HubPageLoadError result={result} />;
  if (!result.value.some((item) => item.kind === kind)) notFound();
  const paging = historyPaging(query);
  return (
    <PlatformAdminShell title="Legal documents" description="Manage drafts, publication history and Terms acceptance.">
      <DocumentNav documents={result.value} selected={kind} />
      {result.value.map(item => <DocumentEditor key={item.kind} document={item} active={item.kind === kind} />)}
      <PagedListUrlProvider><PagedListFrame listKey={listQueryKey({kind, ...paging})} fallback={<Skeleton aria-label="Loading version history" className="h-24 w-full" />}>
        <VersionHistory api={api} kind={kind} paging={paging} />
      </PagedListFrame></PagedListUrlProvider>
    </PlatformAdminShell>
  );
}

function historyPaging(query: {page?: string; pageSize?: string}) {
  const { page, pageSize } = parsePagedSearchParams(query);
  return { page, pageSize: pageSize === 25 ? 25 : 10 };
}

function parseKind(value?: string) {
  const kind = documentKind.safeParse(value ?? "terms");
  return kind.success ? kind.data : notFound();
}

function DocumentNav({documents, selected}: Readonly<{documents: DocumentState[]; selected: DocumentState["kind"]}>) {
  return <nav className="flex gap-4" aria-label="Legal documents">
    {documents.map(({kind}) => <Link key={kind} href={{pathname: "/admin/legal", query: {kind}}}
      className="text-primary underline" aria-current={kind === selected ? "page" : undefined}>
      {titles[kind]}
    </Link>)}
  </nav>;
}
