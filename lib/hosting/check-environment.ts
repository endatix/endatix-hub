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
    name: "ENDATIX_BASE_URL",
    required: true,
    type: "string",
    default: "https://localhost:5001",
    tip: "The Endatix API base URL we will use to make requests to. Can be local or a remote URL.",
  },
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

/**
 * Validates all environment variables defined in the envVars array
 * Returns validation status and error messages
 */
function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const env of envVars) {
    const value = process.env[env.name];

    // Check required variables
    if (env.required && !value) {
      errors.push(
        `${styles.bold(env.name)} is required but not set. ${
          env.tip ? `(${styles.tip(env.tip)})` : ""
        }`,
      );
      continue;
    }

    // Skip validation if not required and not provided
    if (!env.required && value === undefined) {
      if (env.default !== undefined) {
        console.log(
          `${styles.warning(
            `${env.name} not set, will use default: ${env.default}`,
          )}`,
        );
      }
      continue;
    }

    // Type validation if value is provided
    if (value !== undefined && env.type) {
      if (env.type === "number" && isNaN(Number(value))) {
        errors.push(`${env.name} must be a valid number, got "${value}"`);
      }

      if (
        env.type === "boolean" &&
        !["true", "false", "0", "1"].includes(value.toLowerCase())
      ) {
        errors.push(
          `${env.name} must be a boolean (true/false/0/1), got "${value}"`,
        );
      }
    }
  }

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
function checkEnvironment(): void {
  console.log(styles.dim("Checking environment variables..."));
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

checkEnvironment();
