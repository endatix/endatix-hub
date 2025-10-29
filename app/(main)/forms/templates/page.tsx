import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FormTemplatesList from "@/features/form-templates/ui/form-templates-list";
import { getFormTemplates } from "@/services/api";
import Link from "next/link";
import { auth } from "@/auth";
import { createPermissionService } from "@/features/auth/permissions/application";

export default async function FormTemplatesPage() {
  const session = await auth();
  const { requireHubAccess } = await createPermissionService(session);
  await requireHubAccess();

  return (
    <>
      <PageTitle title="Form Templates" />
      <div className="flex-1 space-y-2">
        <Tabs defaultValue="all" className="space-y-0">
          <div className="flex items-center justify-end space-y-0 mb-4">
            <div className="flex items-center space-x-2">
              <Link href="/forms/templates/create">
                <Button variant="default">
                  <FilePlus2 className="h-4 w-4 mr-2" />
                  Create a Form Template
                </Button>
              </Link>
            </div>
          </div>
          <Suspense fallback={<FormTemplatesSkeleton />}>
            <FormsTabsContent />
          </Suspense>
        </Tabs>
      </div>
    </>
  );
}

async function FormsTabsContent() {
  const templates = await getFormTemplates();

  return (
    <TabsContent value="all">
      <FormTemplatesList templates={templates} />
    </TabsContent>
  );
}

function FormTemplatesSkeleton() {
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
