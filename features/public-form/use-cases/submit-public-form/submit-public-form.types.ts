import { z } from "zod";

const SubmissionDataSchema = z.object({
  isComplete: z.boolean().optional(),
  jsonData: z.string().optional(),
  currentPage: z.number().optional(),
  metadata: z.string().optional(),
  reCaptchaToken: z.string().optional(),
});

export const SubmitPublicFormRequestSchema = z.object({
  submissionData: SubmissionDataSchema,
  urlToken: z.string().optional(),
});

export type SubmitPublicFormRequest = z.infer<
  typeof SubmitPublicFormRequestSchema
>;
