import { z } from "zod";

export type DynamicVariable = string | number | boolean | object | undefined;

export type DynamicVariables = Record<string, DynamicVariable>;

export const DynamicVariableSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({}).passthrough(),
  z.undefined(),
]);

export const VariablesSchema = z.record(DynamicVariableSchema);

export const MetadataSchema = z
  .object({
    variables: VariablesSchema.optional(),
  })
  .optional();
