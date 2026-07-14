import { beforeEach, describe, expect, it, vi } from "vitest";
import * as filesDownload from "@/lib/utils/files-download";
import { downloadSubmissionsExport } from "../download-submissions-export";

describe("downloadSubmissionsExport", () => {
  const initiateFileDownloadMock = vi.fn();
  const getFilenameFromContentDispositionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(filesDownload, "initiateFileDownload").mockImplementation(
      initiateFileDownloadMock,
    );
    vi.spyOn(
      filesDownload,
      "getFilenameFromContentDisposition",
    ).mockImplementation(getFilenameFromContentDispositionMock);
  });

  it("downloads the export when the response is successful", async () => {
    const blob = new Blob(["csv,data"]);
    const headers = new Headers({
      "content-disposition": 'attachment; filename="export.csv"',
    });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers,
      blob: vi.fn().mockResolvedValue(blob),
    });

    getFilenameFromContentDispositionMock.mockReturnValue("export.csv");

    await downloadSubmissionsExport(
      "/api/forms/100/export?format=csv",
      "form-100-submissions.csv",
      fetchFn,
    );

    expect(fetchFn).toHaveBeenCalledWith("/api/forms/100/export?format=csv");
    expect(getFilenameFromContentDispositionMock).toHaveBeenCalledWith(
      headers,
      "form-100-submissions.csv",
    );
    expect(initiateFileDownloadMock).toHaveBeenCalledWith(blob, "export.csv");
  });

  it("throws a mapped API error when the response is not ok", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ error: "Form not found." }),
    });

    await expect(
      downloadSubmissionsExport(
        "/api/forms/100/export",
        "form-100-submissions.csv",
        fetchFn,
      ),
    ).rejects.toThrow("Form not found.");

    expect(initiateFileDownloadMock).not.toHaveBeenCalled();
  });
});
