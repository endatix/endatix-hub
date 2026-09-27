"use client";

import { PagedListFrame, useListUrlState } from "@/components/table";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { ResultType } from "@/lib/result";
import { signupRequestsUrlState } from "../signup-requests-url-state";
import { SignupRequestsTableFromPromise } from "./signup-requests-table";
import { SignupRequestsTableSkeleton } from "./signup-requests-table-skeleton";
import { SignupRequestsToolbar } from "./signup-requests-toolbar";

interface SignupRequestsListProps {
  requestsPromise: Promise<
    ResultType<NormalizedPagedResponse<SignupRequestListItem>>
  >;
  listKey: string;
}

export function SignupRequestsList({
  requestsPromise,
  listKey,
}: Readonly<SignupRequestsListProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();
  const urlState = signupRequestsUrlState(searchParams);

  return (
    <>
      <SignupRequestsToolbar
        search={search}
        setSearch={setSearch}
        updateUrl={updateUrl}
        urlState={urlState}
      />
      <PagedListFrame
        listKey={listKey}
        fallback={<SignupRequestsTableSkeleton />}
      >
        <SignupRequestsTableFromPromise
          requestsPromise={requestsPromise}
          updateUrl={updateUrl}
          urlState={urlState}
          isPending={isPending}
        />
      </PagedListFrame>
    </>
  );
}
