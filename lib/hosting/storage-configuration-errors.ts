export type StorageProviderId = "azure" | "s3";

export class MissingConfigurationError extends Error {
  readonly name = "MissingConfigurationError";
  readonly envKeys: readonly string[];
  readonly provider: StorageProviderId;

  constructor(
    message: string,
    envKeys: readonly string[],
    provider: StorageProviderId,
  ) {
    super(message);
    this.envKeys = envKeys;
    this.provider = provider;
  }
}

export class MisconfigurationError extends Error {
  readonly name = "MisconfigurationError";
  readonly envKeys: readonly string[];
  readonly provider: StorageProviderId | null;
  readonly value: string | undefined;

  constructor(
    message: string,
    envKeys: readonly string[],
    provider: StorageProviderId | null,
    value?: string,
  ) {
    super(message);
    this.envKeys = envKeys;
    this.provider = provider;
    this.value = value;
  }
}

export function isMissingConfigurationError(
  error: unknown,
): error is MissingConfigurationError {
  return error instanceof MissingConfigurationError;
}

export function isMisconfigurationError(
  error: unknown,
): error is MisconfigurationError {
  return error instanceof MisconfigurationError;
}

export function formatStorageConfigurationError(error: unknown): string {
  if (isMissingConfigurationError(error)) {
    return error.message;
  }
  if (isMisconfigurationError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
