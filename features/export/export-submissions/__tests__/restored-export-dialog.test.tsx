import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ErrorType, Kind, Result } from "@/lib/result";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { prepareReportingExportAction } from "../../prepare-reporting-export";
import {
  finishPrepare,
  startPrepare,
  type PrepareFailure,
} from "../prepare-recovery";
import { ExportSubmissionsDialog } from "../ui/export-dialog";
import { listFormReportingLocalesAction } from "../list-form-reporting-locales.action";
import { exportGroups, stubAttachments } from "./export-dialog-fixture";

vi.mock("../../prepare-reporting-export", () => ({
  prepareReportingExportAction: vi.fn(),
}));
vi.mock("../list-form-reporting-locales.action", () => ({
  listFormReportingLocalesAction: vi.fn(),
}));
vi.mock("../refresh-incomplete-submissions.action", () => ({
  refreshIncompleteSubmissionsAction: vi.fn(),
}));
vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({}),
}));
vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

const partial = {
  kind: Kind.Error,
  errorType: ErrorType.Error,
  step: "backfill",
  message: "Two submissions failed.",
  traceId: "old-ref",
} as const;
function remember(failure: PrepareFailure) {
  finishPrepare(startPrepare("export-prepare:42"), failure);
}
function mountDialog(groups = exportGroups) {
  return render(
    <ExportSubmissionsDialog
      open
      onOpenChange={vi.fn()}
      formId="42"
      canRebuild
      groups={groups}
      statusGroups={[]}
      listFilters={{ locale: "fr" }}
      isExporting={false}
      onExport={vi.fn()}
    />,
  );
}
function expectExportBlocked() {
  expect(
    screen.queryByRole("button", {
      name: /^Export$|Back to export|Download with previous schema/,
    }),
  ).toBeNull();
}
beforeEach(() => {
  sessionStorage.clear();
  stubResizeObserver();
});

it("explains a failed language lookup and retries it on reopen without downloading the default", async () => {
  // Arrange
  remember({ ...partial, step: "compile", previousSchema: "retained" });
  vi.mocked(listFormReportingLocalesAction)
    .mockResolvedValueOnce(Result.error("Locale service unavailable"))
    .mockResolvedValueOnce(Result.success(["default", "fr"]));
  const request = stubAttachments();
  const group = exportGroups[1];
  const shoji = [
    {
      ...group,
      options: group.options.filter((o) => o.exportFormatId === "cb-shoji"),
    },
  ];
  const download = () =>
    screen.getByRole<HTMLButtonElement>("button", {
      name: "Download with previous schema",
    });

  // Act & Assert
  const view = mountDialog(shoji);
  await screen.findByText(/couldn.t load.*languages.*reopen/i);
  expect(download().disabled).toBe(true);
  fireEvent.click(download());
  expect(request).not.toHaveBeenCalled();
  view.unmount();
  mountDialog(shoji);
  await waitFor(() => expect(download().disabled).toBe(false));
  fireEvent.click(download());
  expect(request.mock.calls[0][0]).toContain("locale=fr");
  await screen.findByText("Your download should start.");
});

it("shows the refusal and its reference now, then the unresolved backfill and its reference on reopen", async () => {
  // Arrange
  remember(partial);
  vi.mocked(prepareReportingExportAction).mockResolvedValueOnce({
    ...partial,
    step: "refused",
    message: "Permission required.",
    traceId: "new-ref",
  });
  const view = mountDialog();

  // Act & Assert
  fireEvent.click(await screen.findByRole("button", { name: "Retry rebuild" }));
  await screen.findByText("Permission required.");
  expect(screen.getByText("new-ref")).toBeDefined();
  expect(screen.queryByText("old-ref")).toBeNull();
  expectExportBlocked();
  view.unmount();
  mountDialog();
  await screen.findByText(partial.message);
  expect(screen.getByText("old-ref")).toBeDefined();
  expect(screen.queryByText("new-ref")).toBeNull();
  expectExportBlocked();
});

it("a refused retry cannot return to a Ready view that predates another attempt's failure", async () => {
  // Arrange
  vi.mocked(listFormReportingLocalesAction).mockResolvedValueOnce(
    Result.success(["default"]),
  );
  vi.mocked(prepareReportingExportAction).mockResolvedValueOnce({
    ...partial,
    step: "refused",
    message: "Permission required.",
    traceId: undefined,
  });
  mountDialog();
  fireEvent.click(
    await screen.findByRole("button", { name: /rebuild reporting data/i }),
  );
  remember(partial);

  // Act
  fireEvent.click(screen.getByRole("button", { name: "Prepare for export" }));

  // Assert
  await screen.findByText("Permission required.");
  expect(screen.queryByText("old-ref")).toBeNull();
  expectExportBlocked();
});
