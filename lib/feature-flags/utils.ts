import { connection } from "next/server";
import { flagFactoryProvider } from "./factories/flag-factory-provider";
import type { FlagDefinition } from "./factories/flag-factory.interface";

export type { FlagEntities } from "./identify";
export { identify } from "./identify";

export function flag<T>(definition: {
  key: string;
  defaultValue: T;
  parsePayload?: (payload: unknown) => T;
}): () => Promise<T>;

export function flag(definition: {
  key: string;
  defaultValue: boolean;
}): () => Promise<boolean>;

export function flag<T extends string | number>(definition: {
  key: string;
  defaultValue: T;
}): () => Promise<T>;

/** `connection()` so Next does not bake flag values at `next build`. */
export function flag<T>(definition: FlagDefinition<T>): () => Promise<T> {
  let evaluate: (() => Promise<T>) | undefined;

  return async (): Promise<T> => {
    await connection();
    evaluate ??= flagFactoryProvider.getFactory().createFlag<T>(definition);
    return evaluate();
  };
}
