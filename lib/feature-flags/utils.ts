import { connection } from "next/server";
import { getSession } from "@/features/auth";
import { flagFactoryProvider } from "./factories/flag-factory-provider";
import type { FlagDefinition } from "./factories/flag-factory.interface";
import { dedupe } from "flags/next";

export interface FlagEntities {
  distinctId: string;
}

export const identify = dedupe(async (): Promise<FlagEntities> => {
  const session = await getSession();
  return {
    distinctId: session.username || "anonymous",
  };
});

// Overload for complex objects with optional parsePayload
export function flag<T>(definition: {
  key: string;
  defaultValue: T;
  parsePayload?: (payload: unknown) => T;
}): () => Promise<T>;

// Overload for boolean flags
export function flag(definition: {
  key: string;
  defaultValue: boolean;
}): () => Promise<boolean>;

// Overload for simple values
export function flag<T extends string | number>(definition: {
  key: string;
  defaultValue: T;
}): () => Promise<T>;

/**
 * `connection()` keeps pages dynamic (do not bake flags at `next build`).
 * Factory is frozen on first `getFactory()` for the process.
 */
export function flag<T>(definition: FlagDefinition<T>): () => Promise<T> {
  let evaluate: (() => Promise<T>) | undefined;

  return async (): Promise<T> => {
    await connection();
    evaluate ??= flagFactoryProvider.getFactory().createFlag<T>(definition);
    return evaluate();
  };
}
