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
import { useFreshRecord } from "@/lib/utils/hooks";
import { Form } from "@/types";
import { getFormAction } from "../application/actions/get-form.action";
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

type PreviewBodyProps = {
  form: Form;
  flags: FormWorkspaceFlags;
  refreshing: boolean;
};

/**
 * Share link opens the public page in a new tab, like the card's quick link; the Share dialog
 * would stack an overlay on this one (DESIGN.md §5 Overlays rule 5).
 */
function FormPreviewBody({
  form,
  flags,
  refreshing,
}: Readonly<PreviewBodyProps>) {
  return (
    <>
      <FormPreviewHeader form={form} />
      <ResponsivePanelBody className="gap-6">
        <FormSummaryCards
          form={form}
          pending={refreshing}
          className="[--grid-card-min:180px]"
        />
        <FormPageLinks formId={form.id} flags={flags} />
      </ResponsivePanelBody>
      <FormPreviewFooter form={form} />
    </>
  );
}

/**
 * Mounted only while the panel is open, so each opening re-reads the form: its counts and status
 * move without the list knowing (DESIGN.md §6 Fresh facts in a preview).
 */
function FormPreviewContent({
  snapshot,
  flags,
}: Readonly<{ snapshot: Form; flags: FormWorkspaceFlags }>) {
  const fresh = useFreshRecord(snapshot, snapshot.id, getFormAction);
  return (
    <FormPreviewBody
      form={fresh.record}
      flags={flags}
      refreshing={fresh.refreshing}
    />
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
      <FormPreviewContent snapshot={selectedForm} flags={workspaceFlags} />
    </ResponsivePanel>
  );
};
export default FormSheet;
