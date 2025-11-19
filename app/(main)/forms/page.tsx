import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import FormsList from "@/features/forms/ui/forms-list";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import CreateFormSheet from "@/features/forms/ui/create-form-sheet";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Session } from "next-auth";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { redirect } from "next/navigation";
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";

export default async function FormsPage() {
  const [session, aiFeatureFlag] = await Promise.all([
    auth(),
    aiFeaturesFlag(),
  ]);

  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  return (
    <>
      <PageTitle title="Forms" />
      <div className="flex-1 space-y-2">
        <Tabs defaultValue="all" className="space-y-0">
          <div className="flex items-center justify-end space-y-0 mb-4">
            <div className="flex items-center space-x-2">
              <Sheet modal={false}>
                <SheetTrigger asChild>
                  <Button variant="default">
                    <FilePlus2 className="h-4 w-4" />
                    Create a Form
                  </Button>
                </SheetTrigger>
                <CreateFormSheet aiFeatureFlag={aiFeatureFlag} />
              </Sheet>
            </div>
          </div>
          <Suspense fallback={<FormsSkeleton />}>
            <FormsTabsContent session={session} />
          </Suspense>
        </Tabs>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card} className="flex flex-col gap-1 justify-between group">
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
