import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import FormTemplatesList from "@/features/form-templates/ui/form-templates-list";
import { getFormTemplates } from "@/services/api";
import Link from "next/link";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";

export default async function FormTemplatesPage() {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  return (
    <>
      <PageTitle title="Form Templates" />
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex justify-end">
          <Link href="/forms/templates/create">
            <Button variant="default">
              <FilePlus2 data-icon="inline-start" />
              Create a Form Template
            </Button>
          </Link>
        </div>
        <Suspense fallback={<FormTemplatesSkeleton />}>
          <FormTemplatesContent />
        </Suspense>
      </div>
    </>
  );
}

function FormTemplatesContent() {
  const templatesPromise = getFormTemplates();

  return (
    <AssetStorageProvider>
      <FormTemplatesList templatesPromise={templatesPromise} />
    </AssetStorageProvider>
  );
}

function FormTemplatesSkeleton() {
  const cards = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card} className="group flex flex-col justify-between gap-1">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
