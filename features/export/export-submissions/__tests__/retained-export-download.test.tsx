import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import * as downloads from "@/lib/utils/files-download";
import { RetainedExportDownload } from "../ui/retained-export-download";

const selection = {
  url: "/api/forms/7/export?exportFormatId=2&locale=fr",
  filename: "form.json",
  formatKey: "codebook",
};
const downloadButton = () =>
  screen.getByRole("button", { name: "Download with previous schema" });
let save: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  save = vi
    .spyOn(downloads, "initiateFileDownload")
    .mockImplementation(() => {});
});

function attachment(blob: Blob) {
  const response = new Response("unused", {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="labels.json"',
    },
  });
  vi.spyOn(response, "blob").mockResolvedValue(blob);
  return response;
}

it("checks and saves the complete attachment in one click", async () => {
  // Arrange
  const blob = new Blob(['{"labels":["fr"]}']);
  const request = vi.fn().mockResolvedValue(attachment(blob));
  vi.stubGlobal("fetch", request);
  render(<RetainedExportDownload selection={selection} />);
  expect(request).not.toHaveBeenCalled();

  // Act
  fireEvent.click(downloadButton());

  // Assert
  expect(await screen.findByText("Your download should start.")).toBeDefined();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(selection.url);
  expect(save).toHaveBeenCalledWith(blob, "labels.json");
});

it("saves the same received file again without fetching it again", async () => {
  // Arrange
  const blob = new Blob(["x".repeat(2048)]);
  const request = vi.fn().mockResolvedValue(attachment(blob));
  vi.stubGlobal("fetch", request);
  render(<RetainedExportDownload selection={selection} />);
  fireEvent.click(downloadButton());

  // Act
  fireEvent.click(
    await screen.findByRole("button", { name: "Save file again (2 KB)" }),
  );

  // Assert
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[1]).toEqual([blob, "labels.json"]);
  expect(request).toHaveBeenCalledTimes(1);
});

it("shows the refusal's reason and support reference, never a bare failure", async () => {
  // Arrange
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          error: "The export plan's locale is not on this form.",
          traceId: "00-plan-ref",
        },
        { status: 400 },
      ),
    ),
  );
  render(<RetainedExportDownload selection={selection} />);

  // Act
  fireEvent.click(downloadButton());

  // Assert
  expect(
    await screen.findByText("The previous export could not be downloaded"),
  ).toBeDefined();
  expect(
    screen.getByText("The export plan's locale is not on this form."),
  ).toBeDefined();
  expect(
    screen.getByRole("button", { name: "Copy support reference" }),
  ).toBeDefined();
  expect(save).not.toHaveBeenCalled();
});

it("says no completed submissions match instead of failing", async () => {
  // Arrange
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "No completed submissions are available to export." },
          { status: 400 },
        ),
      ),
  );
  render(<RetainedExportDownload selection={selection} />);

  // Act
  fireEvent.click(downloadButton());

  // Assert
  expect(
    await screen.findByText(/No completed submissions match these filters/),
  ).toBeDefined();
  expect(screen.queryByText(/could not be downloaded/)).toBeNull();
});

it("cancels an in-flight attachment, and saves nothing, when its selection is discarded", () => {
  // Arrange
  const request = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", request);
  const view = render(<RetainedExportDownload selection={selection} />);

  // Act
  fireEvent.click(downloadButton());
  view.unmount();

  // Assert
  expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  expect(save).not.toHaveBeenCalled();
});
