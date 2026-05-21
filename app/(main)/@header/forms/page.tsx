import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFormsHeaderDataCached,
  buildFormsBreadcrumbModel,
} from "@/features/folders/view-forms-header";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import CreateFormSheet from "@/features/forms/ui/create-form-sheet";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { Suspense } from "react";
import type { FormsBreadcrumbItem } from "@/features/folders/types";

export default async function FormsHeaderSlot() {
  const session = await auth();
  const aiFeatureFlag = await aiFeaturesFlag();
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const breadcrumbItemsPromise = headerDataPromise.then((headerData) =>
    buildFormsBreadcrumbModel({
      section: "forms",
      folders: headerData.folders,
    }),
  );

  return (
    <MainHeader
      sticky
      actions={
        <Suspense fallback={<Skeleton className="h-10 w-[168px]" />}>
          <FormsHeaderActions
            aiFeatureFlag={aiFeatureFlag}
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

async function FormsHeaderBreadcrumb({
  breadcrumbItemsPromise,
}: Readonly<{
  breadcrumbItemsPromise: Promise<FormsBreadcrumbItem[]>;
}>) {
  const items = await breadcrumbItemsPromise;
  return <FormsBreadcrumbNav items={items} />;
}

async function FormsHeaderActions({
  aiFeatureFlag,
  headerDataPromise,
}: Readonly<{
  aiFeatureFlag: boolean;
  headerDataPromise: ReturnType<typeof getFormsHeaderDataCached>;
}>) {
  const headerData = await headerDataPromise;

  return (
    <AssetStorageProvider>
      <FormAssistantProvider
        isAssistantEnabled={aiFeatureFlag}
        requireFolderForNewForms={headerData.requireFolderForNewForms}
        assignableFolders={headerData.assignableFolders}
      >
        <CreateFormSheet />
      </FormAssistantProvider>
    </AssetStorageProvider>
  );
}
