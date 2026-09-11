import { connection } from "next/server";
import { getSession } from "@/features/auth";
import { flagFactoryProvider } from "./factories/flag-factory-provider";
import type {
  FlagDefinition,
  FlagFactory,
} from "./factories/flag-factory.interface";
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
 * The factory is chosen per evaluation, never at module load, so the environment the
 * container was started with wins over the one the image was built with. `connection()`
 * keeps a prerender from baking a flag value into static HTML for the same reason.
 *
 * Each factory keeps its own memoised implementation: the Vercel `flag()` wrapper carries
 * request-scoped caching, so it must be built once per factory rather than per evaluation.
 */
export function flag<T>(definition: FlagDefinition<T>): () => Promise<T> {
  const implementations = new WeakMap<FlagFactory, () => Promise<T>>();

  return async (): Promise<T> => {
    await connection();
    const factory = flagFactoryProvider.getFactory();
    const evaluate =
      implementations.get(factory) ?? factory.createFlag<T>(definition);
    implementations.set(factory, evaluate);
    return evaluate();
  };
}
