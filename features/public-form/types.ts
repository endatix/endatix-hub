import { z } from "zod";
import type { SubmissionGatePhase } from "@/features/submissions/domain";
import type { Submission } from "@/lib/endatix-api";
import type { ClientStorageConfig } from "@endatix/storage-core";
import type { ActiveDefinition } from "@/types";

export type PublicSurveyVariant = "share" | "embed";

export type PublicSurveyRuntimeProps = {
  activeDefinition: ActiveDefinition;
  formId: string;
  submissionPhase: SubmissionGatePhase;
  /**
   * The finished submission came from the cookie and the form allows another
   * response, so the closed or completed page offers a new one.
   */
  canStartOver?: boolean;
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
