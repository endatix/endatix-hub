// Relative: next.config.ts loads this file, and its compile has no "@/" alias.
import styles, { icon } from "../../lib/utils/console-styles";

/**
 * Experimental features configuration.
 * Defaults are off; enable via env (ENDATIX_ENABLE_EXTENSIONS=true).
 * Logged at Node startup (check-environment), not at Next build.
 */

export interface ExperimentalConfig {
  extensions: boolean;
}

const EXPERIMENTAL_FEATURES: ReadonlyArray<keyof ExperimentalConfig> = [
  "extensions",
] as const;

/**
 * Resolves experimental config from environment. All features default to false.
 */
export function getExperimentalConfig(): ExperimentalConfig {
  return {
    extensions: process.env.ENDATIX_ENABLE_EXTENSIONS?.trim() === "true",
  };
}

/**
 * Logs effective experimental feature status (merged config). No-op in test.
 * Encapsulated here for now; later can be moved to centralized config/bootstrap logging.
 */
export function logExperimentalStatus(config: ExperimentalConfig): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  if (process.env.__ENDATIX_LOGGED === "true") {
    return;
  }

  const experiments = EXPERIMENTAL_FEATURES.map((key) => ({
    name: key,
    enabled: config[key],
  }));
  const hasExperiments = experiments.some((e) => e.enabled);

  if (hasExperiments) {
    // Same shape as Next's own "- Experiments (use with caution):" list.
    console.log(`${icon("🚧", "-")} Endatix experiments (use with caution):`);
    experiments.forEach((feature) => {
      const symbol = feature.enabled ? styles.green("✓") : styles.dim("·");
      console.log(`  ${symbol} ${feature.name}`);
    });
  }

  process.env.__ENDATIX_LOGGED = "true";
}
