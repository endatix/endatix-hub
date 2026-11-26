import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HubPageLoadError } from "@/components/error-handling/error-page/hub-page-load-error";
import { PlatformAdminShell } from "@/features/platform-admin/ui/platform-admin-shell";
import { documentApi, documentsPath, options } from "@/features/legal/manage-documents/document-api.server";
import { DocumentEditor } from "@/features/legal/manage-documents/document-editor";
import { documentKind, titles, type DocumentState } from "@/features/legal/manage-documents/documents";
import { VersionHistory } from "@/features/legal/manage-documents/version-history";
import { parsePagedSearchParams } from "@/lib/list-page/parse-paged-search-params";
import { Result, toResult } from "@/lib/result";

interface Props {
  searchParams: Promise<{ kind?: string; page?: string }>;
}
export default async function LegalPage({ searchParams }: Readonly<Props>) {
  const api = await documentApi();
  if (!api) notFound();
  const query = await searchParams;
  const kind = parseKind(query.kind);
  const result = toResult(await api.get<DocumentState[]>(documentsPath), options);
  if (Result.isError(result)) return <HubPageLoadError result={result} />;
  const document = result.value.find((item) => item.kind === kind);
  if (!document) notFound();
  const { page } = parsePagedSearchParams(query);
  return (
    <PlatformAdminShell title="Legal documents" description="Manage drafts, publication history and Terms acceptance.">
      <DocumentNav documents={result.value} selected={document.kind} />
      {result.value.map(item => <DocumentEditor key={item.kind} document={item} active={item.kind === kind} />)}
      <Suspense key={`${kind}:${page}`} fallback={<p>Loading version history…</p>}>
        <VersionHistory api={api} kind={document.kind} page={page} />
      </Suspense>
    </PlatformAdminShell>
  );
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
