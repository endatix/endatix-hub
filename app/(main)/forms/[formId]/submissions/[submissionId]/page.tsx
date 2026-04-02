import { auth } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { authorization } from "@/features/auth/authorization";
import { PdfEmbedView } from "@/features/pdf-export/embed-submission/pdf-embed-view";
import SubmissionDetails from "@/features/submissions/ui/details/submission-details";
import { Suspense } from "react";

type Params = {
  params: Promise<{
    formId: string;
    submissionId: string;
  }>;
  searchParams: Promise<{
    format: string;
  }>;
};

export default async function SubmissionPage({ params, searchParams }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId, submissionId } = await params;
  const { format } = await searchParams;

  if (format?.toLowerCase() === "pdf") {
    return (
      <Suspense fallback={<SubmissionDataSkeleton />}>
        <PdfEmbedView formId={formId} submissionId={submissionId} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<SubmissionDataSkeleton />}>
      <SubmissionDetails formId={formId} submissionId={submissionId} />
    </Suspense>
  );
}

const metadataGridHairline = "bg-border/10 dark:bg-foreground/8";

function SubmissionDataSkeleton() {
  const metadataCells = Array.from({ length: 8 }, (_, index) => index);
  const tabPlaceholders = Array.from({ length: 3 }, (_, index) => index);
  const pageBlocks = Array.from({ length: 2 }, (_, index) => index);
  const questionsPerPage = Array.from({ length: 3 }, (_, index) => index);

  return (
    <div className="w-full">
      {/* Metadata skeleton */}
      <section className="mt-8 overflow-hidden rounded-xl border border-border/25 bg-surface-container-lowest shadow-sm">
        <div className={`flex flex-col gap-px ${metadataGridHairline}`}>
          <div
            className={`grid grid-cols-2 gap-px lg:grid-cols-4 ${metadataGridHairline}`}
          >
            {metadataCells.slice(0, 4).map((i) => (
              <div
                key={i}
                className="space-y-3 bg-surface-container-lowest p-4 sm:p-6"
              >
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-7 max-w-[10rem]" />
              </div>
            ))}
          </div>
          <div
            className={`grid grid-cols-2 gap-px lg:grid-cols-4 ${metadataGridHairline}`}
          >
            {metadataCells.slice(4, 8).map((i) => (
              <div
                key={i}
                className="space-y-3 bg-surface-container-lowest p-4 sm:p-6"
              >
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-7 max-w-[12rem]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-10 lg:flex-row">
        {/* SubmissionDetailsContent (skeleton */}
        <div className="min-w-0 flex-1 space-y-6">
          <div className="w-full min-w-0">
            <nav className="flex w-full flex-wrap border-b border-slate-200 dark:border-slate-700">
              {tabPlaceholders.map((i) => (
                <Skeleton
                  key={i}
                  className="mx-3 my-3 h-5 w-36 sm:mx-6 sm:w-44"
                />
              ))}
            </nav>
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <Skeleton className="h-9 w-44" />
                <Skeleton className="h-9 w-40" />
              </div>
              <div className="space-y-12">
                {pageBlocks.map((page) => (
                  <div key={page} className="space-y-6">
                    <div className="mb-4 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                      <Skeleton className="h-8 w-full max-w-xs sm:max-w-md" />
                    </div>
                    {questionsPerPage.map((q) => (
                      <div
                        key={q}
                        className="rounded-xl border border-slate-200/40 bg-surface-container-lowest p-8 shadow-sm dark:border-slate-700/40 dark:bg-surface-container-low"
                      >
                        <div className="mb-4 space-y-2">
                          <Skeleton className="h-3 w-52" />
                          <Skeleton className="h-6 w-full max-w-lg" />
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-surface-container-low p-5 dark:border-slate-800 dark:bg-surface-container">
                          <Skeleton className="h-28 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SubmissionToC (skeleton) */}
        <aside className="hidden w-72 shrink-0 space-y-6 pr-4 xl:flex xl:flex-col">
          <Skeleton className="h-3 w-32" />
          <div className="rounded-md border border-border/20 p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-[85%]" />
              <Skeleton className="h-3 w-[70%]" />
              <Skeleton className="mt-5 h-4 w-full" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[75%]" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );


}
