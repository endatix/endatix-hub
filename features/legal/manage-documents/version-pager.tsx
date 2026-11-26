"use client";
import { PagedTableFooter, createPagedTableFooterProps } from "@/components/table/paged-table-footer";
import { usePagedListUrl } from "@/components/table/paged-list-url-provider";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";

type Counts = Omit<NormalizedPagedResponse<never>, "items">;
export function VersionPager({counts}: Readonly<{counts: Counts}>) {
  const {updateUrl} = usePagedListUrl();
  const props = createPagedTableFooterProps({...counts, items: []}, "versions", updateUrl);
  return <PagedTableFooter {...props} rowsPerPageLabel="Versions per page" pageSizeOptions={[10, 25]} />;
}
