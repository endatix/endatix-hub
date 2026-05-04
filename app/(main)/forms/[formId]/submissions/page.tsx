import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/features/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  BooleanFilterValue,
  SubmissionReviewStatus,
} from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { SubmissionsWithFilters } from "./ui/submissions-with-filters";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;
const MAX_PAGE_SIZE = 50;
const BOOLEAN_FILTER_VALUES = ["true", "false"] as const;
const SUBMISSION_REVIEW_STATUS_VALUES = ["new", "read", "approved"] as const;

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  }>;
};

export async function generateMetadata(
  { params, searchParams }: Params,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const api = new EndatixApi(session?.accessToken);
  const formResult = await api.forms.get(formId);

  const formName = formResult.success ? formResult.data.name : "Form";

  return {
    title: `Submissions for ${formName}`,
    description: `View all submissions for ${formName}`,
    openGraph: {
      title: `Search params: ${JSON.stringify(await searchParams)}`,
      description: `Parent title: ${(await parent).title}`,
    },
  };
}

export default async function ResponsesPage({ params, searchParams }: Params) {
  const { formId } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={<PageTitle title="Submissions..." />}>
        <PageTitleData formId={formId} />
      </Suspense>
      <Suspense
        fallback={<TableLoader pageSize={parsePageSize(sp.pageSize)} />}
      >
        <SubmissionsTableData formId={formId} searchParams={sp} />
      </Suspense>
    </>
  );
}

async function PageTitleData({ formId }: { formId: string }) {
  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);
  const formResult = await api.forms.get(formId);

  const formName = formResult.success ? formResult.data.name : "Form";

  return <PageTitle title={`Submissions for ${formName}`} />;
}

async function SubmissionsTableData({
  formId,
  searchParams,
}: {
  formId: string;
  searchParams: {
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  };
}) {
  const isCompleteFilter = parseFilterValues(
    searchParams.isComplete,
    BOOLEAN_FILTER_VALUES,
  );

  const statusFilter = parseFilterValues(
    searchParams.status,
    SUBMISSION_REVIEW_STATUS_VALUES,
  );
  const isTestSubmissionFilter = parseFilterValues(
    searchParams.isTestSubmission,
    BOOLEAN_FILTER_VALUES,
  );
  const createdAtFrom = parseDateParam(searchParams.createdAtFrom);
  const createdAtTo = parseDateParam(searchParams.createdAtTo);
  const completedAtFrom = parseDateParam(searchParams.completedAtFrom);
  const completedAtTo = parseDateParam(searchParams.completedAtTo);
  const hasActiveFilters =
    isCompleteFilter.length > 0 ||
    statusFilter.length > 0 ||
    isTestSubmissionFilter.length > 0 ||
    Boolean(createdAtFrom || createdAtTo || completedAtFrom || completedAtTo);
  const page = parsePage(searchParams.page);
  const pageSize = parsePageSize(searchParams.pageSize);
  if (
    !isCanonicalPageRequest(
      searchParams.page,
      searchParams.pageSize,
      page,
      pageSize,
      {
        rawCreatedAtFrom: searchParams.createdAtFrom,
        rawCreatedAtTo: searchParams.createdAtTo,
        rawCompletedAtFrom: searchParams.completedAtFrom,
        rawCompletedAtTo: searchParams.completedAtTo,
        createdAtFrom,
        createdAtTo,
        completedAtFrom,
        completedAtTo,
      },
    )
  ) {
    redirect(
      buildSubmissionsUrl(
        formId,
        isCompleteFilter,
        statusFilter,
        isTestSubmissionFilter,
        { createdAtFrom, createdAtTo, completedAtFrom, completedAtTo },
        page,
        pageSize,
      ),
    );
  }

  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);

  const [submissionsResult, fieldsResult, unfilteredSubmissionsResult] =
    await Promise.all([
      api.submissions.list(formId, {
        page,
        pageSize,
        isComplete: isCompleteFilter,
        status: statusFilter,
        isTestSubmission: isTestSubmissionFilter,
        createdAtFrom,
        createdAtTo,
        completedAtFrom,
        completedAtTo,
      }),
      api.definitions.getFields(formId),
      hasActiveFilters
        ? api.submissions.list(formId, { pageSize: 1 })
        : Promise.resolve(null),
    ]);

  if (!submissionsResult.success) {
    return (
      <SubmissionsLoadError>
        Unable to load submissions. Please try again.
      </SubmissionsLoadError>
    );
  }

  if (!fieldsResult.success) {
    return (
      <SubmissionsLoadError>
        Unable to load submission fields. Please try again.
      </SubmissionsLoadError>
    );
  }

  const canonicalPage = getCanonicalPage(
    page,
    submissionsResult.data.page,
    submissionsResult.data.totalPages,
  );
  if (canonicalPage !== page) {
    redirect(
      buildSubmissionsUrl(
        formId,
        isCompleteFilter,
        statusFilter,
        isTestSubmissionFilter,
        { createdAtFrom, createdAtTo, completedAtFrom, completedAtTo },
        canonicalPage,
        pageSize,
      ),
    );
  }

  const submissions = submissionsResult.data.items;
  const hasAnySubmissions = hasActiveFilters
    ? unfilteredSubmissionsResult?.success === true &&
      unfilteredSubmissionsResult.data.totalRecords > 0
    : submissionsResult.data.totalRecords > 0;
  const definitionFields = fieldsResult.data;

  return (
    <SubmissionsWithFilters
      data={submissions}
      formId={formId}
      hasAnySubmissions={hasAnySubmissions}
      definitionFields={definitionFields}
      initialPage={submissionsResult.data.page}
      initialPageSize={submissionsResult.data.pageSize}
      totalRecords={submissionsResult.data.totalRecords}
      totalPages={submissionsResult.data.totalPages}
      initialIsComplete={isCompleteFilter}
      initialStatus={statusFilter}
      initialIsTestSubmission={isTestSubmissionFilter}
      initialCreatedAtFrom={createdAtFrom}
      initialCreatedAtTo={createdAtTo}
      initialCompletedAtFrom={completedAtFrom}
      initialCompletedAtTo={completedAtTo}
    />
  );
}

function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}

function parsePageSize(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return PAGE_SIZE_OPTIONS.find((option) => parsed <= option) ?? MAX_PAGE_SIZE;
}

function parseDateParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : undefined;
}

function parseFilterValues<T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
) {
  if (!value) {
    return [];
  }

  const allowedSet = new Set<string>(allowedValues);
  return value.split(",").filter((item): item is T => allowedSet.has(item));
}

function isCanonicalPageRequest(
  rawPage: string | undefined,
  rawPageSize: string | undefined,
  page: number,
  pageSize: number,
  dateParams: {
    rawCreatedAtFrom?: string;
    rawCreatedAtTo?: string;
    rawCompletedAtFrom?: string;
    rawCompletedAtTo?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  },
) {
  const canonicalPage =
    page === DEFAULT_PAGE ? rawPage === undefined : rawPage === String(page);
  const canonicalPageSize =
    pageSize === DEFAULT_PAGE_SIZE
      ? rawPageSize === undefined
      : rawPageSize === String(pageSize);

  return (
    canonicalPage &&
    canonicalPageSize &&
    dateParams.rawCreatedAtFrom === dateParams.createdAtFrom &&
    dateParams.rawCreatedAtTo === dateParams.createdAtTo &&
    dateParams.rawCompletedAtFrom === dateParams.completedAtFrom &&
    dateParams.rawCompletedAtTo === dateParams.completedAtTo
  );
}

function getCanonicalPage(
  requestedPage: number,
  responsePage: number,
  totalPages: number,
) {
  if (totalPages <= 0) {
    return DEFAULT_PAGE;
  }

  if (requestedPage > totalPages) {
    return totalPages;
  }

  if (responsePage > 0 && responsePage !== requestedPage) {
    return Math.min(responsePage, totalPages);
  }

  return requestedPage;
}

function buildSubmissionsUrl(
  formId: string,
  isCompleteFilter: BooleanFilterValue[],
  statusFilter: SubmissionReviewStatus[],
  isTestSubmissionFilter: BooleanFilterValue[],
  dateFilters: {
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  },
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();

  if (page > DEFAULT_PAGE) {
    params.set("page", String(page));
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(pageSize));
  }
  if (isCompleteFilter.length > 0) {
    params.set("isComplete", isCompleteFilter.join(","));
  }
  if (statusFilter.length > 0) {
    params.set("status", statusFilter.join(","));
  }
  if (isTestSubmissionFilter.length > 0) {
    params.set("isTestSubmission", isTestSubmissionFilter.join(","));
  }
  if (dateFilters.createdAtFrom) {
    params.set("createdAtFrom", dateFilters.createdAtFrom);
  }
  if (dateFilters.createdAtTo) {
    params.set("createdAtTo", dateFilters.createdAtTo);
  }
  if (dateFilters.completedAtFrom) {
    params.set("completedAtFrom", dateFilters.completedAtFrom);
  }
  if (dateFilters.completedAtTo) {
    params.set("completedAtTo", dateFilters.completedAtTo);
  }

  const queryString = params.toString();
  return (
    queryString
      ? `/forms/${formId}/submissions?${queryString}`
      : `/forms/${formId}/submissions`
  ) as Route;
}

function SubmissionsLoadError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

function TableLoader({ pageSize }: { pageSize: number }) {
  const pageSizeNumber = pageSize;
  const rowHeight = 60;
  const rows = Array.from({ length: pageSizeNumber }, (_, i) => i + 1);
  return (
    <div className="relative flex w-full flex-col space-y-3 overflow-auto">
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
      {rows.map((row) => (
        <Skeleton key={row} className={`h-[${rowHeight}px] w-full p-4`} />
      ))}
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
    </div>
  );
}
