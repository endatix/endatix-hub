import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFormsBreadcrumbModel,
  getFormsHeaderDataCached,
  resolveFolderForNavBySlug,
} from "@/features/folders/view-forms-header";
import { FormsHeaderCreateActions } from "@/features/forms/ui/forms-header-create-actions";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { Suspense } from "react";
import type { FormsBreadcrumbItem } from "@/features/folders/types";

type FormsFolderHeaderSlotProps = {
  folderSlug: string;
  section?: "forms" | "templates";
};

export async function FormsFolderHeaderSlot({
  folderSlug,
  section = "forms",
}: Readonly<FormsFolderHeaderSlotProps>) {
  const session = await auth();
  const aiFeatureFlag = await aiFeaturesFlag();
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const breadcrumbItemsPromise = headerDataPromise.then(async (headerData) => {
    const currentFolder = await resolveFolderForNavBySlug(
      session?.accessToken,
      folderSlug,
      headerData.folders,
    );

    return buildFormsBreadcrumbModel({
      section,
      currentFolderSlug: currentFolder?.slug ?? folderSlug,
      currentFolderName: currentFolder?.name ?? null,
      folders: headerData.folders,
    });
  });

  return (
    <MainHeader
      sticky
      actions={
        <Suspense fallback={<Skeleton className="h-10 w-[168px]" />}>
          <FolderFormsHeaderActions
            aiFeatureFlag={aiFeatureFlag}
            folderSlug={folderSlug}
            headerDataPromise={headerDataPromise}
          />
        </Suspense>
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
  const folder = await resolveFolderForNavBySlug(
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
