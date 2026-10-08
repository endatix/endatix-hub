import styles, { icon } from "@/lib/utils/console-styles";
import {
  AuthProviderRegistry,
  AuthProviderStatus,
  authRegistry,
} from "./auth-provider-registry";

/**
 * Prints the registered auth providers once, from instrumentation at server
 * start, in the shape of the experiments list: a title, then one row per
 * provider, a check for an active one and a red cross with the reason for one
 * that is not. Import `@/auth` first so custom registrations are included.
 */
export function logAuthProviders(
  registry: AuthProviderRegistry = authRegistry,
): void {
  const statuses = registry.getProviderStatuses();
  const anyActive = statuses.some((status) => status.state === "active");
  const title = `${icon("🔐", "-")} Auth providers:`;

  if (anyActive) {
    console.info(title);
  } else {
    console.warn(`${title} ${styles.dim("(none active)")}`);
  }
  for (const status of statuses) {
    if (status.state === "active") {
      console.info(`  ${styles.green("✓")} ${status.id}`);
    } else {
      console.warn(
        `  ${styles.red("✗")} ${status.id} ${styles.dim(`(${reason(status)})`)}`,
      );
    }
  }
}

function reason(status: AuthProviderStatus): string {
  if (status.state !== "failed") {
    return "invalid configuration";
  }
  const { error } = status;
  const message = error instanceof Error ? error.message : String(error);
  return `registration failed: ${message}`;
}
