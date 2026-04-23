import PageTitle from "@/components/headings/page-title";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import FormsList from "@/features/forms/ui/forms-list";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Session } from "next-auth";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { redirect } from "next/navigation";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import { AssetStorageProvider } from "@/features/asset-storage/server";

export default async function FormsPage() {
  const session = await auth();

  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  return (
    <>
      <PageTitle title="Forms" className="mt-2 mb-4" />
      <div className="flex-1">
        <AssetStorageProvider>
          <Tabs defaultValue="all" className="space-y-0">
            <Suspense fallback={<FormsSkeleton />}>
              <FormsTabsContent session={session} />
            </Suspense>
          </Tabs>
        </AssetStorageProvider>
      </div>
    </>
  );
}

async function FormsTabsContent({ session }: { session: Session | null }) {
  const endatixApi = new EndatixApi(session?.accessToken);
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
      <FormsList forms={formsResult.data} />
    </TabsContent>
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
