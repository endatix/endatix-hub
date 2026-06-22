"use client";

import { Form } from "@/types";
import FormCard from "./form-card";
import type { FormFolderContext } from "@/features/forms/list-forms/utils";
import type { FormFolderChipProps } from "./form-folder-chip";
import { useState, useMemo } from "react";
import FormSheet from "./form-sheet";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

type FormDataProps = {
  forms: Form[];
  showFolderContext?: boolean;
  folderContextById?: ReadonlyMap<string, FormFolderContext>;
};

const FormsList = ({
  forms,
  showFolderContext = false,
  folderContextById,
}: FormDataProps) => {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [saveAsTemplateFormId, setSaveAsTemplateFormId] = useState<
    string | null
  >(null);

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId),
    [selectedFormId, forms],
  );

  const saveAsTemplateForm = useMemo(
    () => forms.find((form) => form.id === saveAsTemplateFormId),
    [saveAsTemplateFormId, forms],
  );

  const handleOnOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedFormId(null);
    }
  };

  const handleFormSelected = (formId: string) => {
    setSelectedFormId(formId);
    setIsSheetOpen(true);
  };

  const handleSaveAsTemplateClick = (formId: string) => {
    setSaveAsTemplateFormId(formId);
    setIsSaveAsTemplateOpen(true);
  };

  const handleSaveAsTemplateOpenChange = (open: boolean) => {
    setIsSaveAsTemplateOpen(open);
    if (!open) {
      setSaveAsTemplateFormId(null);
    }
  };

  const resolveFolderContext = (
    form: Form,
  ): FormFolderChipProps | undefined => {
    if (!showFolderContext) {
      return undefined;
    }

    if (!form.folderId) {
      return { label: "Unassigned", unassigned: true };
    }

    const folderContext = folderContextById?.get(form.folderId);
    if (!folderContext) {
      return { label: "Folder" };
    }

    return {
      label: folderContext.name,
      immutable: folderContext.immutable,
      isActive: folderContext.isActive,
    };
  };

  return (
    <>
      <div className="grid-card-list">
        {forms.map((form) => (
          <FormCard
            key={form.id}
            form={form}
            folderContext={resolveFolderContext(form)}
            isSelected={form.id === selectedFormId}
            onClick={() => handleFormSelected(form.id)}
            onSaveAsTemplate={() => handleSaveAsTemplateClick(form.id)}
          />
        ))}
      </div>

      <FormSheet
        open={isSheetOpen}
        onOpenChange={handleOnOpenChange}
        selectedForm={selectedForm ?? null}
        enableEditing={true}
      />

      {saveAsTemplateForm && (
        <SaveAsTemplateDialog
          formId={saveAsTemplateForm.id}
          formName={saveAsTemplateForm.name}
          open={isSaveAsTemplateOpen}
          onOpenChange={handleSaveAsTemplateOpenChange}
        />
      )}
    </>
  );
};

export default FormsList;
