"use client";

import { useState } from "react";
import { MoreHorizontal, Save, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteFormConfirm } from "@/features/forms/ui/delete-form-confirm";
import { SaveAsTemplateDialog } from "@/features/forms/ui/save-as-template-dialog";
import { ShareDialog } from "@/features/forms/ui/share-dialog";
import type { Form } from "@/types";
import { FormDesignButton } from "./form-design-button";
import type { FormWorkspaceSectionId } from "../form-workspace-sections";

type FormRecord = Pick<Form, "id" | "name" | "submissionsCount">;

type RecordActionsProps = {
  formId: string;
  from?: FormWorkspaceSectionId;
  /** Absent when the form failed to load; Design and Share still work. */
  form?: FormRecord | null;
};

type Dialog = "share" | "template" | "delete" | null;

/**
 * Record actions for every form page: Design is the one primary. Share is beside it from
 * `md` up and in the menu below that, with Save as template and Delete.
 */
export function FormRecordActions({
  formId,
  from,
  form,
}: Readonly<RecordActionsProps>) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="hidden md:inline-flex"
        onClick={() => setDialog("share")}
      >
        <Share2 />
        Share
      </Button>
      <FormDesignButton formId={formId} from={from} variant="default" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="md:hidden"
            onSelect={() => setDialog("share")}
          >
            <Share2 />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!form}
            onSelect={() => setDialog("template")}
          >
            <Save />
            Save as Template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!form}
            onSelect={() => setDialog("delete")}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareDialog
        formId={formId}
        open={dialog === "share"}
        onOpenChange={(open) => !open && close()}
      />
      {form ? (
        <>
          <SaveAsTemplateDialog
            formId={form.id}
            formName={form.name}
            open={dialog === "template"}
            onOpenChange={(open) => !open && close()}
          />
          <DeleteFormConfirm
            form={form}
            open={dialog === "delete"}
            onClose={close}
          />
        </>
      ) : null}
    </div>
  );
}
