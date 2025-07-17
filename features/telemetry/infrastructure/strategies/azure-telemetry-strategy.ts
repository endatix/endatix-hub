import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import {
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { logs } from "@opentelemetry/api-logs";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";

/**
 * Azure Application Insights telemetry initialization strategy
 */
export class AzureTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry for Azure environment
   * @param resource OpenTelemetry resource
   * @returns The initialized SDK
   */
  initialize(resource: Resource): NodeSDK {
    const azureTelemetryOptions = {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    };

    if (!azureTelemetryOptions.connectionString) {
      throw new Error(
        "APPLICATIONINSIGHTS_CONNECTION_STRING is not configured",
      );
    }

    const traceExporter = new AzureMonitorTraceExporter(azureTelemetryOptions);
    const logExporter = new AzureMonitorLogExporter(azureTelemetryOptions);

    const loggerProvider = new LoggerProvider({
      processors: [new BatchLogRecordProcessor(logExporter)],
    });

    // Register logger provider as global
    logs.setGlobalLoggerProvider(loggerProvider);

    // Create the SDK
    const sdk = new NodeSDK({
      resource,
      autoDetectResources: true,
      traceExporter: traceExporter,
      spanProcessor: new BatchSpanProcessor(traceExporter),
      instrumentations: [new HttpInstrumentation(), new FetchInstrumentation()],
    });

    return sdk;
  }

  name: string = "Azure AppInsights";
}
