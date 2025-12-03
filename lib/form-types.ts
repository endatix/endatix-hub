import { z } from "zod";

export const CreateFormRequestSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  isEnabled: z.boolean(),
  formDefinitionJsonData: z.string(),
});

export type CreateFormRequest = z.infer<typeof CreateFormRequestSchema>;

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
