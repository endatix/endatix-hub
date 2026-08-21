'use client';

import { TableSearchInput } from '@/components/table';
import { useListUrlState } from '@/lib/list-page/use-list-url-state';

export function DataListsListToolbar() {
  const { search, setSearch } = useListUrlState();

  return (
    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <TableSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name or description"
        ariaLabel="Search data lists"
      />
    </div>
  );
}
