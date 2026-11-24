import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import * as downloads from "@/lib/utils/files-download";
import { RetainedExportCheck } from "../ui/retained-export-check";

const selection = {
  url: "/api/forms/7/export?exportFormatId=2&locale=fr",
  filename: "form.json",
  formatKey: "codebook",
};
const check = () =>
  screen.getByRole("button", { name: "Check previous export" });
const save = "Download using previous schema";

it("saves the received attachment without fetching again", async () => {
  // Arrange
  const blob = new Blob(['{"labels":["fr"]}']);
  const response = new Response("unused", {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="labels.json"',
    },
  });
  vi.spyOn(response, "blob").mockResolvedValue(blob);
  const request = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", request);
  const download = vi
    .spyOn(downloads, "initiateFileDownload")
    .mockImplementation(() => {});
  render(<RetainedExportCheck selection={selection} />);
  expect(request).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: save })).toBeNull();

  // Act
  fireEvent.click(check());
  fireEvent.click(await screen.findByRole("button", { name: save }));

  // Assert
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(selection.url);
  expect(download).toHaveBeenCalledWith(blob, "labels.json");
});

it("cancels an in-flight attachment when its selection is discarded", () => {
  // Arrange
  const request = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", request);
  const view = render(<RetainedExportCheck selection={selection} />);

  // Act
  fireEvent.click(check());
  view.unmount();

  // Assert
  expect(request.mock.calls[0][1].signal.aborted).toBe(true);
});
