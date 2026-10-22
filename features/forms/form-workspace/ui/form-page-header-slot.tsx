import { Suspense } from "react";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { NavSwitcher } from "@/components/layout-ui/navigation/nav-switcher";
import { Separator } from "@/components/ui/separator";
import { getWorkspaceForm } from "../load-workspace-form.server";
import { loadFormPageNav } from "../form-workspace.server";
import type { FormWorkspaceSectionId } from "../form-workspace-sections";
import { FormRecordActions } from "./form-record-actions";

type Props = { formId: string; active?: FormWorkspaceSectionId };

async function FormPageNav({ formId, active }: Readonly<Props>) {
  const { trail, switcher } = await loadFormPageNav(formId, active);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <FormsBreadcrumbNav items={trail} />
      {switcher ? (
        <>
          <Separator
            orientation="vertical"
            className="shrink-0 data-[orientation=vertical]:h-4"
          />
          <span className="shrink-0">
            <NavSwitcher {...switcher} />
          </span>
        </>
      ) : null}
    </div>
  );
}

async function FormRecordActionsSlot({ formId, active }: Readonly<Props>) {
  const result = await getWorkspaceForm(formId);
  const loaded = result.success ? result.data : null;
  return (
    <FormRecordActions
      formId={formId}
      from={active}
      form={
        loaded
          ? {
              id: loaded.id,
              name: loaded.name,
              submissionsCount: loaded.submissionsCount,
            }
          : null
      }
    />
  );
}

/**
 * The sticky header of a form's pages: the trail to the form, a divider, the switcher of its
 * pages, and the record actions (Design, Share, more).
 */
export function FormPageHeaderSlot(props: Readonly<Props>) {
  return (
    <MainHeader
      sticky
      actions={
        <Suspense fallback={<Skeleton className="h-9 w-44" />}>
          <FormRecordActionsSlot {...props} />
        </Suspense>
      }
      breadcrumb={
        <Suspense fallback={<Skeleton className="h-4 w-[260px]" />}>
          <FormPageNav {...props} />
        </Suspense>
      }
    />
  );
}
