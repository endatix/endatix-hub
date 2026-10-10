"use client";

import Link from "next/link";
import type { Route } from "next";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { Form } from "@/types";
import {
  FormDesignButton,
  NO_OPTIONAL_SECTIONS,
  type FormWorkspaceFlags,
} from "../form-workspace";
import { FormPageLinks } from "../form-workspace/ui/form-page-links";
import { FormSummaryCards } from "../form-workspace/ui/form-summary-cards";

interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedForm: Form | null;
  workspaceFlags?: FormWorkspaceFlags;
}

function FormPreviewFooter({ form }: Readonly<{ form: Form }>) {
  return (
    <ResponsivePanelFooter>
      <Button variant="outline" asChild>
        <Link href={`/share/${form.id}` as Route} target="_blank">
          <Link2 />
          Share link
        </Link>
      </Button>
      <FormDesignButton formId={form.id} variant="default" />
    </ResponsivePanelFooter>
  );
}

function FormPreviewHeader({ form }: Readonly<{ form: Form }>) {
  return (
    <ResponsivePanelHeader>
      <ResponsivePanelTitle className="text-xl break-words">
        {form.name}
      </ResponsivePanelTitle>
      <ResponsivePanelDescription>
        {form.description ||
          "What this form has collected, and where to go next."}
      </ResponsivePanelDescription>
    </ResponsivePanelHeader>
  );
}

/**
 * Share link opens the public page in a new tab, like the card's quick link; the Share dialog
 * would stack an overlay on this one (DESIGN.md §5 Overlays rule 5).
 */
function FormPreviewContent({
  form,
  flags,
}: Readonly<{ form: Form; flags: FormWorkspaceFlags }>) {
  return (
    <>
      <FormPreviewHeader form={form} />
      <ResponsivePanelBody className="gap-6">
        <FormSummaryCards form={form} className="[--grid-card-min:180px]" />
        <FormPageLinks formId={form.id} flags={flags} />
      </ResponsivePanelBody>
      <FormPreviewFooter form={form} />
    </>
  );
}

/**
 * A form picked from the list, as a record preview (DESIGN.md §5 Overlays): its facts and the
 * ways into it. Read-only — settings are edited on the form's Settings page.
 */
const FormSheet = ({
  selectedForm,
  workspaceFlags = NO_OPTIONAL_SECTIONS,
  open,
  onOpenChange,
}: FormSheetProps) => {
  if (!selectedForm) return null;
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={onOpenChange}
      desktopType="complex"
    >
      <FormPreviewContent form={selectedForm} flags={workspaceFlags} />
    </ResponsivePanel>
  );
};
export default FormSheet;
