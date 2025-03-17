"use client";

import { FormTemplate } from "@/types";
import { useState } from "react";
import FormTemplateCard from "./form-template-card";

type FormTemplatesListProps = {
  templates: FormTemplate[];
};

const FormTemplatesList = ({ templates }: FormTemplatesListProps) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const handleTemplateSelected = (templateId: string) => {
    setSelectedTemplateId(templateId);
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
    </>
  );
};

export default FormTemplatesList;
