import { auth } from "@/auth";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFormsBreadcrumbModel } from "@/features/folders/view-forms-header";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { FormsBreadcrumbItem } from "@/features/folders/types";

export default async function FormTemplatesHeaderSlot() {
  const session = await auth();
  const headerDataPromise = getFormsHeaderDataCached(session?.accessToken);
  const breadcrumbItemsPromise = headerDataPromise.then((headerData) =>
    buildFormsBreadcrumbModel({
      section: "templates",
      folders: headerData.folders,
    }),
  );

  return (
    <MainHeader
      sticky
      breadcrumb={
        <Suspense fallback={<Skeleton className="h-4 w-[220px]" />}>
          <TemplatesHeaderBreadcrumb
            breadcrumbItemsPromise={breadcrumbItemsPromise}
          />
        </Suspense>
      }
      actions={
        <Link href="/forms/templates/create">
          <Button variant="default">
            <FilePlus2 data-icon="inline-start" />
            Create a Form Template
          </Button>
        </Link>
      }
    />
  );
}

async function TemplatesHeaderBreadcrumb({
  breadcrumbItemsPromise,
}: Readonly<{
  breadcrumbItemsPromise: Promise<FormsBreadcrumbItem[]>;
}>) {
  const items = await breadcrumbItemsPromise;
  return <FormsBreadcrumbNav items={items} />;
}
