import type { FlagFactory, FlagDefinition } from "./flag-factory.interface";

// Get environment variable flag value
function getEnvFlag<T>(key: string, defaultValue: T): T {
  const baseKey = `FLAG_${key.toUpperCase().replace(/-/g, "_")}`;
  const envValue = process.env[baseKey];

  if (envValue === undefined) {
    return defaultValue;
  }

  // Parse based on default value type
  if (typeof defaultValue === "boolean") {
    return (envValue === "true") as T;
  }

  if (typeof defaultValue === "object" && defaultValue !== null) {
    try {
      return JSON.parse(envValue) as T;
    } catch {
      console.warn(`Failed to parse JSON for ${key}, using default`);
      return defaultValue;
    }
  }

  return envValue as T;
}

export class EnvironmentFlagFactory implements FlagFactory {
  createFlag<T>(definition: FlagDefinition<T>): () => Promise<T> {
    return async (): Promise<T> => {
      return getEnvFlag(definition.key, definition.defaultValue);
    };
  }
}
