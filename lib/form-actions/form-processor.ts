import { z } from "zod";

export interface FormActionState<T> {
  isSuccess?: boolean;
  formErrors?: string[];
  errors?: Record<string, string[]>;
  formState?: Partial<T>;
  errorCode?: string;
}

// Helper function to get Zod object keys with proper typing
function getSchemaKeys<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): (keyof T)[] {
  return Object.keys(schema.shape) as (keyof T)[];
}

export function createFormProcessor<T extends z.ZodRawShape>(
  formData: FormData | { get(key: string): string | null },
  schema: z.ZodObject<T>,
) {
  // Get keys from the schema with proper typing
  const schemaKeys = getSchemaKeys(schema);

  // Auto-extract all fields from the schema
  const rawData = schemaKeys.reduce(
    (acc: Record<string, unknown>, key: keyof T) => {
      acc[key as string] = formData.get(key as string);
      return acc;
    },
    {} as Record<string, unknown>,
  );

  // Validate immediately and store result
  const validationResult = schema.safeParse(rawData);

  return {
    // Core validation result (already computed)
    validationResult: () => validationResult,

    // State methods
    toErrorState(): FormActionState<z.infer<z.ZodObject<T>>> {
      const errors = validationResult.success
        ? null
        : validationResult.error.flatten();
        
      return {
        isSuccess: false,
        formErrors: errors?.formErrors || [],
        errors: errors?.fieldErrors
          ? (Object.fromEntries(
              Object.entries(errors.fieldErrors).map(([key, value]) => [
                key,
                value || [],
              ]),
            ) as Record<string, string[]>)
          : {},
        formState: rawData as Partial<z.infer<z.ZodObject<T>>>,
      };
    },

    // Single data access method
    get formState() {
      return rawData;
    },
  };
}
