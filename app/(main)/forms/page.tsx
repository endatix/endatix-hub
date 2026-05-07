import PageTitle from "@/components/headings/page-title";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import FormsList from "@/features/forms/ui/forms-list";
import { FolderNavigationCards } from "@/features/folders/ui/folder-navigation-cards";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { redirect } from "next/navigation";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { getFormsHeaderDataCached } from "@/features/folders/application/get-forms-header-data";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FilePlus2, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function FormsPage() {
  const session = await auth();

  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);

  return (
    <>
      <div className="mt-2 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Forms" />
      </div>
      <Suspense fallback={<FolderCardsSkeleton />}>
        <FormsFoldersSection headerDataPromise={headerDataPromise} />
      </Suspense>
      <div className="flex-1">
        <AssetStorageProvider>
          <Tabs defaultValue="all" className="space-y-0">
            <Suspense fallback={<FormsSkeleton />}>
              <FormsTabsContent accessToken={session?.accessToken} />
            </Suspense>
          </Tabs>
        </AssetStorageProvider>
      </div>
    </>
  );
}

async function FormsFoldersSection({
  headerDataPromise,
}: Readonly<{
  headerDataPromise: ReturnType<typeof getFormsHeaderDataCached>;
}>) {
  const headerData = await headerDataPromise;
  if (headerData.folders.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <FolderNavigationCards
        folders={headerData.folders}
        targetBasePath="/forms/folders"
      />
    </div>
  );
}

async function FormsTabsContent({
  accessToken,
}: {
  accessToken: string | undefined;
}) {
  const endatixApi = new EndatixApi(accessToken);
  const formsResult = await endatixApi.forms.list();

  if (ApiResult.isError(formsResult)) {
    if (formsResult.error.type === ApiErrorType.AuthError) {
      return redirect(SIGNIN_PATH);
    }

    if (formsResult.error.type === ApiErrorType.ForbiddenError) {
      return redirect(UNAUTHORIZED_PATH);
    }

    return (
      <div className="p-8 text-destructive">{formsResult.error.message}</div>
    );
  }

  return (
    <TabsContent value="all">
      {formsResult.data.length === 0 ? (
        <NoFormsEmptyState />
      ) : (
        <FormsList forms={formsResult.data} />
      )}
    </TabsContent>
  );
}

function NoFormsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>No forms yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any forms yet. Create your first form to
          start collecting submissions.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button asChild>
          <Link href="/forms/create">
            <FilePlus2 data-icon="inline-start" />
            Create a Form
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function FormsSkeleton() {
  const cards = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card} className="group flex flex-col justify-between gap-1">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderCardsSkeleton() {
  return (
    <div className="grid-card-list mb-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}
