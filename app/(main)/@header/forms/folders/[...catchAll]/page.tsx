import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFormsBreadcrumbModel } from "@/features/folders/application/build-forms-breadcrumb-model";
import { getFormsHeaderDataCached } from "@/features/folders/application/get-forms-header-data";
import { Suspense } from "react";
import type { FormsBreadcrumbItem } from "@/features/folders/application/build-forms-breadcrumb-model";

type CatchAllParams = {
  catchAll?: string[];
};

export default async function DefaultHeaderSlot({
  params,
}: Readonly<{
  params: Promise<CatchAllParams>;
}>) {
  const session = await auth();
  const { catchAll = [] } = await params;
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const routeContext = getRouteContext(catchAll);
  const breadcrumbItemsPromise = headerDataPromise.then((headerData) =>
    buildFormsBreadcrumbModel({
      section: routeContext.section,
      currentFolderSlug: routeContext.currentFolderSlug,
      folders: headerData.folders,
    }),
  );

  return (
    <MainHeader
      breadcrumb={
        <Suspense fallback={<Skeleton className="h-4 w-[220px]" />}>
          <FormsHeaderBreadcrumb
            breadcrumbItemsPromise={breadcrumbItemsPromise}
          />
        </Suspense>
      }
    />
  );
}

function getRouteContext(catchAll: string[]): {
  section: "forms" | "templates";
  currentFolderSlug: string | null;
} {
  const isTemplatesSection = catchAll[0] === "templates";
  const section: "forms" | "templates" = isTemplatesSection
    ? "templates"
    : "forms";

  // Supported shapes:
  // - forms folders: ["folders", "<slug>"]
  // - templates folders: ["templates", "folders", "<slug>"]
  const folderIndex = isTemplatesSection ? 2 : 1;
  const currentFolderSlug =
    catchAll[folderIndex - 1] === "folders"
      ? (catchAll[folderIndex] ?? null)
      : null;

  return { section, currentFolderSlug };
}

async function FormsHeaderBreadcrumb({
  breadcrumbItemsPromise,
}: Readonly<{
  breadcrumbItemsPromise: Promise<FormsBreadcrumbItem[]>;
}>) {
  const items = await breadcrumbItemsPromise;
  return <FormsBreadcrumbNav items={items} />;
}
