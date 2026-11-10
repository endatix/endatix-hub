import { z } from "zod";

export const OpenPublicFormRequestSchema = z.object({
  urlToken: z.string().optional(),
});

export type OpenPublicFormRequest = z.infer<typeof OpenPublicFormRequestSchema>;
