"use client";

import { FormTemplate } from "@/types";
import { useState, useMemo } from "react";
import FormSheet from "@/features/forms/ui/form-sheet";
import FormTemplateCard from './form-template-card';

type FormTemplatesListProps = {
  templates: FormTemplate[];
};

const FormTemplatesList = ({ templates }: FormTemplatesListProps) => {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedForm = useMemo(
    () => templates.find((template) => template.id === selectedFormId),
    [selectedFormId, templates],
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedFormId}
            onClick={() => handleFormSelected(template.id)}
          />
        ))}
      </div>

      <FormSheet
        modal={false}
        open={isSheetOpen}
        onOpenChange={handleOnOpenChange}
        selectedForm={selectedForm ?? null}
      />
    </>
  );
};

export default FormTemplatesList;
