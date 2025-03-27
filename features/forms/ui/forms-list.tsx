"use client";

import { Form } from "@/types";
import FormCard from "./form-card";
import { useState, useMemo } from "react";
import FormSheet from "./form-sheet";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

type FormDataProps = {
  forms: Form[];
};

const FormsList = ({ forms }: FormDataProps) => {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [saveAsTemplateFormId, setSaveAsTemplateFormId] = useState<string | null>(null);

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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 gap-y-6">
        {forms.map((form) => (
          <FormCard
            key={form.id}
            form={form}
            isSelected={form.id === selectedFormId}
            onClick={() => handleFormSelected(form.id)}
            onSaveAsTemplate={() => handleSaveAsTemplateClick(form.id)}
          />
        ))}
      </div>

      <FormSheet
        modal={false}
        open={isSheetOpen}
        onOpenChange={handleOnOpenChange}
        selectedForm={selectedForm ?? null}
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
