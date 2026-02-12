/**
 * Experimental features configuration.
 * Defaults are off; enable via env (ENDATIX_ENABLE_EXTENSIONS=true) or withEndatix options.
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
    extensions: process.env.ENDATIX_ENABLE_EXTENSIONS === "true",
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
    console.log("🚧 Endatix experimental features (use with caution):");
    experiments.forEach((feature) => {
      const symbol = feature.enabled ? "\x1b[32m✓\x1b[0m" : "\x1b[90m·\x1b[0m";
      console.log(`  ${symbol} ${feature.name}`);
    });
    console.log("");
  }

  process.env.__ENDATIX_LOGGED = "true";
}
