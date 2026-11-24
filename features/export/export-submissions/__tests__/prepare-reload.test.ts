// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { ErrorType, Kind } from "@/lib/result";

it("a refused retry after reload preserves interruption until a rebuild succeeds", async () => {
  // Arrange: reload the JavaScript runtime but keep the tab's session storage.
  const key = "export-prepare:42";
  const before = await import("../prepare-recovery");
  before.startPrepare(key);
  vi.resetModules();
  const after = await import("../prepare-recovery");
  expect(after.readPrepareFailure(key)).toMatchObject(after.unconfirmed);

  // Act & Assert
  after.finishPrepare(after.startPrepare(key), {
    kind: Kind.Error,
    errorType: ErrorType.Error,
    message: "Permission required",
    step: "refused",
  });
  expect(after.readPrepareFailure(key)).toMatchObject(after.unconfirmed);
  after.finishPrepare(after.startPrepare(key), null);
  expect(after.readPrepareFailure(key)).toBeNull();
});
