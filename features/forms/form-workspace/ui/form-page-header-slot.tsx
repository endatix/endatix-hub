import { Suspense } from "react";
import MainHeader from "@/components/layout-ui/header/main-header";
import FormsBreadcrumbNav from "@/components/layout-ui/navigation/forms-breadcrumb-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { NavSwitcher } from "@/components/layout-ui/navigation/nav-switcher";
import { Separator } from "@/components/ui/separator";
import { loadFormPageNav } from "../form-workspace.server";
import {
  isFormDesignPrimary,
  type FormWorkspaceSectionId,
} from "../form-workspace-sections";
import { FormDesignButton } from "./form-design-button";

type Props = { formId: string; active?: FormWorkspaceSectionId };

async function FormPageNav({ formId, active }: Readonly<Props>) {
  const { trail, switcher } = await loadFormPageNav(formId, active);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <FormsBreadcrumbNav items={trail} />
      {switcher ? (
        <>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          <NavSwitcher {...switcher} />
        </>
      ) : null}
    </div>
  );
}

/**
 * The sticky header of a form's pages: the trail to the form, a divider, the switcher of its
 * pages, and the way into the designer in the header's action area.
 */
export function FormPageHeaderSlot(props: Readonly<Props>) {
  return (
    <MainHeader
      sticky
      actions={
        <FormDesignButton
          formId={props.formId}
          from={props.active}
          variant={isFormDesignPrimary(props.active) ? "default" : "outline"}
        />
      }
      breadcrumb={
        <Suspense fallback={<Skeleton className="h-4 w-[260px]" />}>
          <FormPageNav {...props} />
        </Suspense>
      }
    />
  );
}
