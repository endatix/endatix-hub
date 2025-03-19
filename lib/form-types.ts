export interface CreateFormRequest {
  name: string;
  isEnabled: boolean;
  formDefinitionJsonData: string;
}

export interface CreateFormResult {
  isSuccess: boolean;
  error?: string;
  formId?: string;
}

export interface CreateFormTemplateRequest {
  name: string;
  isEnabled: boolean;
  jsonData: string;
  description?: string;
}

export interface CreateFormTemplateResult {
  isSuccess: boolean;
  error?: string;
  formTemplateId?: string;
}
