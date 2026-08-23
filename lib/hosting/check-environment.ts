/**
 * Environment variable validator
 *
 * Validates required environment variables and provides typechecking
 * and default values for optional ones.
 */

import {
  DEFAULT_COOKIE_DURATION,
  DEFAULT_COOKIE_NAME,
} from "@/features/public-form/infrastructure/cookie-store";
import { validateStorageProfile } from "@/features/asset-storage/infrastructure/bootstrap/validate-storage-profile";
import {
  API_ORIGIN_ENV_TIP,
  ensureResolvedApiUrl,
} from "@/features/config/api-config";
import {
  getExperimentalConfig,
  logExperimentalStatus,
} from "@/features/config/experimental-config";
import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import styles from "../utils/console-styles";

type EnvConfig = {
  name: string;
  required: boolean;
  type?: "string" | "number" | "boolean";
  default?: string | number | boolean;
  tip?: string;
};

/**
 * List of environment variables used by the application
 * Add all env vars here to validate them at startup
 */
const envVars: EnvConfig[] = [
  {
    name: "SESSION_SECRET",
    required: true,
    type: "string",
    tip: "Secret key is required to encrypt session data. Check env.example for more information on how to generate a valid value.",
  },
  {
    name: "NEXT_FORMS_COOKIE_NAME",
    required: false,
    type: "string",
    default: DEFAULT_COOKIE_NAME,
    tip: "Name of the cookie used to store form tokens",
  },
  {
    name: "NEXT_FORMS_COOKIE_DURATION_DAYS",
    required: false,
    type: "number",
    default: DEFAULT_COOKIE_DURATION,
    tip: "Duration of form cookies in days",
  },
];

function collectApiOriginErrors(): string[] {
  if (ensureResolvedApiUrl()) {
    return [];
  }

  return [
    `${styles.bold("ENDATIX_BASE_URL")} or ${styles.bold("ENDATIX_API_URL")} is required but neither resolves to a valid API origin. (${styles.tip(API_ORIGIN_ENV_TIP)})`,
  ];
}

const BOOLEAN_ENV_VALUES = new Set(["true", "false", "0", "1"]);

function missingRequiredMessage(
  env: EnvConfig,
  value: string | undefined,
): string | undefined {
  if (!env.required || value) {
    return undefined;
  }

  const tip = env.tip ? `(${styles.tip(env.tip)})` : "";
  return `${styles.bold(env.name)} is required but not set. ${tip}`;
}

function logOptionalDefault(env: EnvConfig): void {
  if (env.default === undefined) {
    return;
  }

  console.log(
    `${styles.warning(
      `${env.name} not set, will use default: ${env.default}`,
    )}`,
  );
}

function typeMismatchMessage(
  env: EnvConfig,
  value: string,
): string | undefined {
  if (env.type === "number" && Number.isNaN(Number(value))) {
    return `${env.name} must be a valid number, got "${value}"`;
  }

  if (env.type === "boolean" && !BOOLEAN_ENV_VALUES.has(value.toLowerCase())) {
    return `${env.name} must be a boolean (true/false/0/1), got "${value}"`;
  }
  
  return undefined;
}

function collectEnvVarErrors(configs: EnvConfig[]): string[] {
  const errors: string[] = [];

  for (const env of configs) {
    const value = process.env[env.name];
    const missing = missingRequiredMessage(env, value);
    if (missing) {
      errors.push(missing);
      continue;
    }
    if (value === undefined) {
      logOptionalDefault(env);
      continue;
    }
    const typeError = typeMismatchMessage(env, value);
    if (typeError) {
      errors.push(typeError);
    }
  }

  return errors;
}

function collectStorageErrors(): string[] {
  const storageProfile = getRuntimeStorageProfile();
  const storageErrors = validateStorageProfile(storageProfile);

  const isBlobStorageEnabled =
    storageProfile.provider === "azure" || storageProfile.provider === "s3";

  if (storageErrors.length === 0 && !isBlobStorageEnabled) {
    console.log(
      `${styles.warning(
        "Storage service is not enabled. Set STORAGE_PROVIDER to azure or s3 and configure the provider env vars.",
      )}`,
    );
  }

  return storageErrors;
}

/**
 * Validates all environment variables defined in the envVars array
 * Returns validation status and error messages
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors = [
    ...collectApiOriginErrors(),
    ...collectEnvVarErrors(envVars),
    ...collectStorageErrors(),
  ];

  return { valid: errors.length === 0, errors };
}

/**
 * Validates environment variables and handles validation failures
 *
 * In development mode, this will terminate the application if validation fails,
 * forcing developers to fix environment issues before proceeding.
 *
 * In production mode, it logs warnings but allows the application to continue
 * running to prevent unexpected downtime, though some features may not work
 * correctly without proper environment configuration.
 */
export function checkEnvironment(): void {
  console.log(styles.dim("Checking environment variables..."));
  logExperimentalStatus(getExperimentalConfig());
  const { valid, errors } = validateEnv();
  if (!valid) {
    console.error(
      `\n${styles.error("Environment validation failed. Details:")}`,
    );
    errors.forEach((err) => console.error(` ${styles.red("-")} ${err}`));

    if (process.env.NODE_ENV === "development") {
      // In development, we can crash the app to force fixing the issue
      console.error(
        `\n${styles.red(
          "🛑 Application startup aborted due to missing required environment variables.",
        )} Check logs above for details.`,
      );
      process.exit(1);
    } else {
      // In production, log but allow to continue
      console.error(
        `${styles.error(
          "Application starting with invalid environment configuration",
        )}`,
      );
    }
  } else {
    console.log(`${styles.success("Environment validation passed")}`);
  }
}

if (process.env.VITEST !== "true") {
  checkEnvironment();
}
