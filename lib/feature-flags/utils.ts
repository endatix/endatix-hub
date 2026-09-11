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
 * Factory chosen per evaluation (after `connection()`), not at module load.
 * One Vercel `flag()` wrapper per factory — that wrapper is request-cached.
 */
export function flag<T>(definition: FlagDefinition<T>): () => Promise<T> {
  const implementations = new WeakMap<FlagFactory, () => Promise<T>>();

  return async (): Promise<T> => {
    await connection();
    const factory = flagFactoryProvider.getFactory();
    let evaluate = implementations.get(factory);
    if (!evaluate) {
      evaluate = factory.createFlag<T>(definition);
      implementations.set(factory, evaluate);
    }
    return evaluate();
  };
}
