import { z } from "zod";

export const CreateFormRequestSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  isEnabled: z.boolean(),
  formDefinitionJsonData: z.string(),
  folderId: z.string().optional().nullable(),
});

export type CreateFormRequest = z.infer<typeof CreateFormRequestSchema>;

export interface CreateFormResult {
  isSuccess: boolean;
  error?: string;
  formId?: string;
}

export interface CreateFormTemplateRequest {
  name: string;
  jsonData: string;
  description?: string;
  folderId?: string | null;
}

export interface CreateFormTemplateResult {
  isSuccess: boolean;
  error?: string;
  formTemplateId?: string;
}
