import { Result, type ResultType } from "@/lib/result";
import { BulkReadUrlsOptions } from "../../core/storage-operation-types";

/** Represents the configuration for bulk read storage. */
export interface BulkReadStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  sasReadExpiryMinutes: number;
}

/** Represents the expiry of a read token. */
export interface ReadTokenExpiry {
  now: Date;
  expiresOn: Date;
}

/** Computes the expiry of a read token. */
export function computeReadTokenExpiry(
  expiresInMinutes: number | undefined,
  defaultMinutes: number,
): ReadTokenExpiry {
  const now = new Date(Date.now());
  const expirationMs = (expiresInMinutes ?? defaultMinutes) * 60 * 1000;
  const expiresOn = new Date(now.valueOf() + expirationMs);
  return { now, expiresOn };
}

/** Validates the options for bulk read URLs. */
export function validateBulkReadUrlsOptions(
  config: BulkReadStorageConfig,
  options: BulkReadUrlsOptions,
  providerLabel: string,
): ResultType<void> {
  const { containerName, resourceType, resourceNames } = options;

  if (!config.isEnabled) {
    return Result.error(`${providerLabel} storage is not enabled`);
  }

  if (!config.isPrivate) {
    return Result.error(`${providerLabel} storage is not private`);
  }

  if (!containerName) {
    return Result.validationError("A container name is not provided");
  }

  if (!resourceType) {
    return Result.validationError("A resource type is not provided");
  }

  if (resourceType === "container") {
    return Result.validationError(
      "Container-level read tokens are not supported; use per-file reads",
    );
  }

  if (!resourceNames || resourceNames.length === 0) {
    return Result.validationError(
      "Resource names are required for file or directory resource types",
    );
  }

  return Result.success(undefined);
}
