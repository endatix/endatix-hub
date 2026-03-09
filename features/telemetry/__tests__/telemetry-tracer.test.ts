import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelemetryTracer } from "../infrastructure/telemetry-tracer";

const mockRecordException = vi.fn();
const mockSetStatus = vi.fn();
const mockEnd = vi.fn();
const mockSpan = {
  recordException: mockRecordException,
  setStatus: mockSetStatus,
  end: mockEnd,
};

const mockStartActiveSpan = vi.fn();
vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: mockStartActiveSpan,
    }),
  },
}));

describe("TelemetryTracer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartActiveSpan.mockImplementation(
      (_name: string, fn: (span: typeof mockSpan) => unknown) => {
        const result = fn(mockSpan);
        return result instanceof Promise ? result : Promise.resolve(result);
      },
    );
  });

  it("getTracer returns tracer from trace.getTracer", () => {
    const tracer = TelemetryTracer.getTracer("test-service");
    expect(tracer).toBeDefined();
    expect(tracer.startActiveSpan).toBe(mockStartActiveSpan);
  });

  it("traceAsync invokes callback with span and returns result", async () => {
    const result = await TelemetryTracer.traceAsync(
      "svc",
      "op",
      async (span) => {
        expect(span).toBe(mockSpan);
        return 42;
      },
    );

    expect(result).toBe(42);
    expect(mockStartActiveSpan).toHaveBeenCalledWith(
      "op",
      expect.any(Function),
    );
    expect(mockEnd).toHaveBeenCalled();
  });

  it("traceAsync on throw calls recordException and setStatus then rethrows", async () => {
    const err = new Error("fail");

    mockStartActiveSpan.mockImplementation(
      (_name: string, fn: (span: typeof mockSpan) => Promise<never>) => {
        return fn(mockSpan).catch((e) => {
          throw e;
        });
      },
    );

    await expect(
      TelemetryTracer.traceAsync("svc", "op", async () => {
        throw err;
      }),
    ).rejects.toThrow("fail");

    expect(mockRecordException).toHaveBeenCalledWith(err);
    expect(mockSetStatus).toHaveBeenCalledWith({ code: 2 });
    expect(mockEnd).toHaveBeenCalled();
  });

  it("trace invokes sync callback with span and returns result", () => {
    mockStartActiveSpan.mockImplementation(
      (_name: string, fn: (span: typeof mockSpan) => number) => {
        return fn(mockSpan);
      },
    );

    const result = TelemetryTracer.trace("svc", "sync-op", (span) => {
      expect(span).toBe(mockSpan);
      return 100;
    });

    expect(result).toBe(100);
    expect(mockEnd).toHaveBeenCalled();
  });

  it("trace on throw calls recordException and setStatus then rethrows", () => {
    const err = new Error("sync fail");
    mockStartActiveSpan.mockImplementation(
      (_name: string, fn: (span: typeof mockSpan) => number) => {
        try {
          return fn(mockSpan);
        } catch (e) {
          throw e;
        }
      },
    );

    expect(() =>
      TelemetryTracer.trace("svc", "sync-op", () => {
        throw err;
      }),
    ).toThrow("sync fail");

    expect(mockRecordException).toHaveBeenCalledWith(err);
    expect(mockSetStatus).toHaveBeenCalledWith({ code: 2 });
    expect(mockEnd).toHaveBeenCalled();
  });
});
