"use client";

import { useCreateProperty } from "../use-create-property.hook";
import { PropertyCreateFields } from "./property-create-fields";

type PropertyCreateFormProps = {
  formId: string;
};

export function PropertyCreateForm({
  formId,
}: Readonly<PropertyCreateFormProps>) {
  const form = useCreateProperty(formId);
  return (
    <PropertyCreateFields
      pending={form.pending}
      name={form.name}
      dataType={form.dataType}
      onNameChange={form.setName}
      onDataTypeChange={form.setDataType}
      onCreate={form.create}
    />
  );
}
