"use client";

import { FormTemplate } from "@/types";
import { useMemo, useState } from "react";
import FormTemplateCard from "./form-template-card";
import FormTemplateSheet from "./form-template-sheet";

type FormTemplatesListProps = {
  templates: FormTemplate[];
};

const FormTemplatesList = ({ templates }: FormTemplatesListProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleTemplateSelected = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsSheetOpen(true);
  };

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
  );

  const handleOnOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedTemplateId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {templates.map((template) => (
          <FormTemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedTemplateId}
            onClick={() => handleTemplateSelected(template.id)}
          />
        ))}
      </div>

      <FormTemplateSheet
        modal={false}
        selectedTemplate={selectedTemplate ?? null}
        open={isSheetOpen}
        onOpenChange={handleOnOpenChange}
      />
    </>
  );
};

export default FormTemplatesList;
