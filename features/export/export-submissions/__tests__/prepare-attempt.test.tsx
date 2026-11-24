import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  prepareReportingExportAction,
  type PrepareReportingExportResult,
} from "../../prepare-reporting-export";
import { Kind, ErrorType, Result } from "@/lib/result";
import { usePrepareAttempt } from "../use-prepare-attempt.hook";

vi.mock("../../prepare-reporting-export", () => ({
  prepareReportingExportAction: vi.fn(),
}));
const server = vi.mocked(prepareReportingExportAction);
const mounted = () => renderHook(() => usePrepareAttempt("42"));
function restored(view = mounted()) {
  act(() => {
    view.result.current.restoreFailure();
  });
  return view.result.current.failure;
}
const success = Result.success({
  formDefinitionId: "1",
  processed: 1,
  failed: 0,
  skipped: 0,
  batches: 1,
});
const retained = {
  kind: Kind.Error,
  errorType: ErrorType.Error,
  step: "compile",
  previousSchema: "retained",
  message: "Alias conflict",
  traceId: "compile-ref",
} as const;
const partial = {
  ...retained,
  step: "backfill",
  previousSchema: undefined,
  message: "One row failed",
  traceId: "backfill-ref",
} as const;
const refusal = {
  ...partial,
  step: "refused",
  message: "Form edit permission required",
} as const;
beforeEach(() => sessionStorage.clear());

it.each([success, retained, partial, refusal])(
  "only the owning attempt may finish after remount (late outcome %#)",
  async (late) => {
    // Arrange
    const a = Promise.withResolvers<PrepareReportingExportResult>();
    const b = Promise.withResolvers<PrepareReportingExportResult>();
    server.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const first = mounted();
    const startedA = first.result.current.prepare(true);
    first.unmount();
    const second = mounted();
    const startedB = second.result.current.prepare(true);

    // Act
    a.resolve(late);
    await act(async () => {
      await startedA;
    });
    second.unmount();
    const reload = mounted();

    // Assert
    expect(restored(reload)?.message).toMatch(/could not be confirmed/i);
    b.resolve(success);
    await act(async () => {
      await startedB;
    });
    expect(restored(reload)).toBeNull();
  },
);

it.each([retained, partial])(
  "refusal preserves the prior outcome and trace on return (%#)",
  async (prior) => {
    // Arrange
    server.mockResolvedValueOnce(prior).mockResolvedValueOnce(refusal);
    const first = mounted();
    await act(async () => {
      await first.result.current.prepare(true);
    });
    first.unmount();
    const second = mounted();

    // Act
    await act(async () => {
      await second.result.current.prepare(true);
    });
    second.unmount();

    // Assert
    expect(restored()).toMatchObject({
      step: prior.step,
      traceId: prior.traceId,
      previousSchema: prior.previousSchema,
    });
  },
);

it("a refusal before any mutation leaves ordinary readiness available", async () => {
  server.mockResolvedValueOnce(refusal);
  const first = mounted();
  await act(async () => {
    await first.result.current.prepare(true);
  });
  first.unmount();
  expect(restored()).toBeNull();
});

it("a rejected compile after a partial replacement cannot restore its old download", async () => {
  // Arrange
  server.mockResolvedValueOnce(partial).mockResolvedValueOnce(retained);
  const first = mounted();
  await act(async () => {
    await first.result.current.prepare(true);
  });
  first.unmount();
  const retry = mounted();
  // Act
  await act(async () => {
    await retry.result.current.prepare(false);
  });
  retry.unmount();
  // Assert
  expect(restored()).toMatchObject({
    step: "compile",
    traceId: "compile-ref",
    previousSchema: undefined,
  });
});
