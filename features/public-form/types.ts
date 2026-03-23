import { z } from "zod";

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
