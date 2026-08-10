import type { LoggerInstance } from "@auth/core/types";
import { TelemetryLogger } from "@/features/telemetry";

/**
 * Logger name applied to every record this bridge emits, so auth failures can be
 * filtered as a group in a telemetry backend.
 */
const AUTH_LOGGER_NAME = "auth";

/**
 * Routes Auth.js's internal logging into OpenTelemetry.
 *
 * Auth.js logs through its own console-only logger, so without this bridge its output —
 * including every authentication failure — never reaches an OTLP exporter. Those are among
 * the most operationally important events the Hub produces, and they were invisible in the
 * telemetry backend while being plainly visible in `docker logs`.
 *
 * Console output is mirrored deliberately. `TelemetryLogger` suppresses its own console
 * fallback whenever an exporter is configured, so forwarding alone would *remove* `[auth]`
 * lines from container logs on exactly the deployments that enable telemetry — trading one
 * blind spot for another.
 *
 * Any method left undefined here falls back to the Auth.js default.
 */
export const authTelemetryLogger: Partial<LoggerInstance> = {
  error(error: Error) {
    console.error(`[auth][error] ${error?.message ?? error}`);

    TelemetryLogger.error(
      `Auth error: ${error?.message ?? "unknown"}`,
      error,
      { "auth.error.name": error?.name ?? "unknown" },
      AUTH_LOGGER_NAME,
    );
  },

  warn(code: string) {
    console.warn(`[auth][warn] ${code}`);

    TelemetryLogger.warn(
      `Auth warning: ${code}`,
      { "auth.warning.code": code },
      AUTH_LOGGER_NAME,
    );
  },

  debug(message: string, metadata?: unknown) {
    // Auth.js only calls this when `debug: true`, and it is extremely chatty. Emitted at
    // debug severity so a backend's level filter drops it by default rather than paying to
    // ingest it.
    TelemetryLogger.debug(
      `Auth debug: ${message}`,
      { "auth.debug.metadata": metadata === undefined ? "" : String(metadata) },
      AUTH_LOGGER_NAME,
    );
  },
};
