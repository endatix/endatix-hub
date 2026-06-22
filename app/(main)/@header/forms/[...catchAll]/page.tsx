import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFormsBreadcrumbModel,
  getFormsHeaderDataCached,
  resolveFormsHeaderRouteContext,
  resolveFormsNavFolderBySlug,
} from "@/features/folders/view-forms-header";
import { FormsHeaderCreateActions } from "@/features/forms/ui/forms-header-create-actions";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { Suspense } from "react";
import type { FormsBreadcrumbItem } from "@/features/folders/types";

type CatchAllParams = {
  catchAll: string[];
};

export default async function FormsCatchAllHeaderSlot({
  params,
}: Readonly<{
  params: Promise<CatchAllParams>;
}>) {
  const session = await auth();
  const aiFeatureFlag = await aiFeaturesFlag();
  const { catchAll } = await params;
  const routeContext = resolveFormsHeaderRouteContext(catchAll);
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const breadcrumbItemsPromise = headerDataPromise.then(async (headerData) => {
    const currentFolder = routeContext.currentFolderSlug
      ? await resolveFormsNavFolderBySlug(
          session?.accessToken,
          routeContext.currentFolderSlug,
          headerData.folders,
        )
      : null;

    return buildFormsBreadcrumbModel({
      section: routeContext.section,
      currentFolderSlug: currentFolder?.slug ?? routeContext.currentFolderSlug,
      currentFolderName: currentFolder?.name ?? null,
      folders: headerData.folders,
    });
  });

  return (
    <MainHeader
      sticky
      actions={
        routeContext.currentFolderSlug ? (
          <Suspense fallback={<Skeleton className="h-10 w-[168px]" />}>
            <FolderFormsHeaderActions
              aiFeatureFlag={aiFeatureFlag}
              folderSlug={routeContext.currentFolderSlug}
              headerDataPromise={headerDataPromise}
            />
          </Suspense>
        ) : null
      }
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

async function FolderFormsHeaderActions({
  aiFeatureFlag,
  folderSlug,
  headerDataPromise,
}: Readonly<{
  aiFeatureFlag: boolean;
  folderSlug: string;
  headerDataPromise: ReturnType<typeof getFormsHeaderDataCached>;
}>) {
  const session = await auth();
  const headerData = await headerDataPromise;
  const folder = await resolveFormsNavFolderBySlug(
    session?.accessToken,
    folderSlug,
    headerData.folders,
  );

  return (
    <FormsHeaderCreateActions
      aiFeatureFlag={aiFeatureFlag}
      headerData={headerData}
      defaultFolderId={folder?.id}
      defaultFolderSlug={folder?.slug ?? folderSlug}
      defaultFolderName={folder?.name}
    />
  );
}

async function FormsHeaderBreadcrumb({
  breadcrumbItemsPromise,
}: Readonly<{
  breadcrumbItemsPromise: Promise<FormsBreadcrumbItem[]>;
}>) {
  const items = await breadcrumbItemsPromise;
  return <FormsBreadcrumbNav items={items} />;
}
