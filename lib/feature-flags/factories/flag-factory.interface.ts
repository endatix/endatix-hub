export interface FlagDefinition<T> {
  key: string;
  defaultValue: T;
  parsePayload?: (payload: unknown) => T;
}

export interface FlagFactory {
  createFlag<T>(definition: FlagDefinition<T>): () => Promise<T>;
}
