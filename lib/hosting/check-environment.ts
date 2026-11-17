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
import {
  ClientIpEnv,
  parseTrustedProxies,
  TrustedProxiesConfigError,
} from "./trusted-proxies";
import { authSecretError } from "./auth-secret";

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

function logWarning(message: string): void {
  console.log(styles.warning(message));
}

/** Optional setting: an invalid list disables forwarding, so it only warns. */
function warnOnInvalidTrustedProxies(): void {
  try {
    parseTrustedProxies(process.env[ClientIpEnv.TRUSTED_PROXIES]);
  } catch (error) {
    if (!(error instanceof TrustedProxiesConfigError)) {
      throw error;
    }
    logWarning(
      `${error.message}. Visitor IPs are not forwarded to the API until it is fixed.`,
    );
  }
}

function collectStorageErrors(): string[] {
  const storageProfile = getRuntimeStorageProfile();
  const storageErrors = validateStorageProfile(storageProfile);

  const isBlobStorageEnabled =
    storageProfile.provider === "azure" || storageProfile.provider === "s3";

  if (storageErrors.length === 0 && !isBlobStorageEnabled) {
    logWarning(
      "Storage service is not enabled. Set STORAGE_PROVIDER to azure or s3 and configure the provider env vars.",
    );
  }

  return storageErrors;
}

function collectFatalErrors(): string[] {
  const error = authSecretError(process.env.AUTH_SECRET);
  return error ? [error] : [];
}

/**
 * Validates the environment. `fatalErrors` stop startup in every environment;
 * `errors` stop it in development only.
 */
export function validateEnv(): {
  valid: boolean;
  errors: string[];
  fatalErrors: string[];
} {
  warnOnInvalidTrustedProxies();
  const fatalErrors = collectFatalErrors();
  const errors = [
    ...collectApiOriginErrors(),
    ...collectEnvVarErrors(envVars),
    ...collectStorageErrors(),
  ];

  return {
    valid: errors.length === 0 && fatalErrors.length === 0,
    errors,
    fatalErrors,
  };
}

function abortStartup(): void {
  console.error(
    `\n${styles.red(
      "🛑 Application startup aborted due to invalid environment variables.",
    )} Check logs above for details.`,
  );
  process.exit(1);
}

/**
 * Validates environment variables and handles validation failures.
 *
 * A fatal error (an unusable AUTH_SECRET) stops startup in every environment.
 * Other errors stop it in development; in production they are logged and the
 * application keeps running, so a partial misconfiguration does not cause downtime.
 */
export function checkEnvironment(): void {
  const { valid, errors, fatalErrors } = validateEnv();
  if (valid) {
    console.log(styles.success("Environment validation passed"));
  } else {
    console.error(
      `\n${styles.error("Environment validation failed. Details:")}`,
    );
    [...fatalErrors, ...errors].forEach((err) =>
      console.error(` ${styles.red("-")} ${err}`),
    );

    if (fatalErrors.length > 0 || process.env.NODE_ENV === "development") {
      abortStartup();
    } else {
      console.error(
        `${styles.error(
          "Application starting with invalid environment configuration",
        )}`,
      );
    }
  }
  logExperimentalStatus(getExperimentalConfig());
}

if (process.env.VITEST !== "true") {
  checkEnvironment();
}
