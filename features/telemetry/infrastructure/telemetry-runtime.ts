/**
 * What actually started in this process, as opposed to what env asks for.
 * TelemetryLogger reads it to decide whether a record needs the console: config
 * alone cannot tell a running exporter from one whose constructor threw.
 */
let logPipelineActive = false;

export const TelemetryRuntime = {
  /**
   * Record whether log records reach a destination: an Azure or OTLP log
   * exporter, or the JSON stdout exporter.
   */
  markLogPipelineActive(active: boolean): void {
    logPipelineActive = active;
  },

  isLogPipelineActive(): boolean {
    return logPipelineActive;
  },

  /** Test isolation only. */
  reset(): void {
    logPipelineActive = false;
  },
};
