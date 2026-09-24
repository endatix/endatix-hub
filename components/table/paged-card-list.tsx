"use client";

import { Suspense, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PagedListFrame } from "./paged-list-frame";

interface PagedCardListProps {
  /** Search and filters. Stays mounted across page, filter, and sort changes. */
  toolbar: ReactNode;
  /** `listQueryKey(parsedRequest)` from the server page. */
  listKey: string;
  /** The grid: calls `use(promise)` and renders rows plus its footer. */
  children: ReactNode;
  /** `isPending` from the shell's `useListUrlState`: skeleton rows while paging. */
  isPending?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * Card chrome for a paged list: the toolbar in the header, outside the keyed
 * frame, so typing a search never remounts the input; the grid inside it, so
 * each new page replaces the rows. The toolbar may suspend on its own data
 * (role or tenant options) without hiding the grid.
 */
export function PagedCardList({
  toolbar,
  listKey,
  children,
  isPending,
  className = "gap-0 py-0",
  headerClassName = "border-b bg-card py-4",
}: Readonly<PagedCardListProps>) {
  return (
    <Card className={className}>
      <CardHeader className={headerClassName}>
        <Suspense fallback={<Skeleton className="h-9 w-full" />}>
          {toolbar}
        </Suspense>
      </CardHeader>
      <PagedListFrame
        listKey={listKey}
        isPending={isPending}
        fallback={<RowsSkeleton />}
      >
        {children}
      </PagedListFrame>
    </Card>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3 p-4" data-slot="paged-card-list-skeleton">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
