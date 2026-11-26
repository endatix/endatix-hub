"use client";
import { PagedTableFooter, createPagedTableFooterProps } from "@/components/table/paged-table-footer";
import { usePagedListUrl } from "@/components/table/paged-list-url-provider";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { formatInteger } from "@/lib/utils/formatters";

type Counts = Omit<NormalizedPagedResponse<never>, "items">;
export function VersionPager({ counts, itemCount }: Readonly<{ counts: Counts; itemCount: number }>) {
  const {updateUrl} = usePagedListUrl();
  const props = createPagedTableFooterProps({...counts, items: []}, "versions", updateUrl);
  const summaryText = itemCount === 0 ? `Total versions: ${formatInteger(counts.totalRecords)}` : undefined;
  return <PagedTableFooter {...props} summaryText={summaryText} rowsPerPageLabel="Versions per page" pageSizeOptions={[10, 25]} />;
}
