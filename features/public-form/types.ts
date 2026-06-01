import { z } from "zod";
import type { SubmissionGatePhase } from "@/features/public-form/domain/submission-gate";
import type { Submission } from "@/lib/endatix-api";
import type { ClientStorageConfig } from "@endatix/storage-core";
import type { ActiveDefinition } from "@/types";

export type PublicSurveyVariant = "share" | "embed";

export type PublicSurveyRuntimeProps = {
  activeDefinition: ActiveDefinition;
  formId: string;
  submissionPhase: SubmissionGatePhase;
  isRespondentTestMode: boolean;
  storageConfig: ClientStorageConfig | null;
  submission?: Submission;
  urlToken?: string;
  variant: PublicSurveyVariant;
};

export type DynamicVariable = string | number | boolean | object | undefined;

export type DynamicVariables = Record<string, DynamicVariable>;

export const DynamicVariableSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.looseObject({}),
  z.undefined(),
]);

export const VariablesSchema = z.record(z.string(), DynamicVariableSchema);

export const MetadataSchema = z
  .object({
    variables: VariablesSchema.optional(),
    language: z.string().optional(),
  })
  .optional();

export type Metadata = z.infer<typeof MetadataSchema>;
