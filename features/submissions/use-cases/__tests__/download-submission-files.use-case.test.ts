import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadSubmissionFilesUseCase } from "../download-submission-files.use-case";
import * as filesDownloadUtils from "@/lib/utils/files-download";
import { toast } from "@/components/ui/toast";
import { EMPTY_FILE_HEADER } from '@/lib/utils/files-download';

// Mock toast and icons
vi.mock("@/components/ui/toast", () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/icons", () => ({
  FolderX: "FolderX",
  FolderDown: "FolderDown",
}));

describe("downloadSubmissionFilesUseCase", () => {
  const formId = "form-1";
  const submissionId = "sub-1";

  let fetchMock: ReturnType<typeof vi.fn>;
  let initiateFileDownloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    initiateFileDownloadMock = vi.fn();
    vi.spyOn(filesDownloadUtils, "initiateFileDownload").mockImplementation(
      initiateFileDownloadMock,
    );
    vi.spyOn(
      filesDownloadUtils,
      "getFilenameFromContentDisposition",
    ).mockImplementation(() => "file.zip");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles successful download", async () => {
    const headers = new Headers();
    const blob = new Blob(["test"]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers,
      blob: () => Promise.resolve(blob),
      // no x-endatix-empty-file header
      // ...other fetch Response props
    });
    await downloadSubmissionFilesUseCase({ formId, submissionId });
    expect(toast.info).toHaveBeenCalled();
    expect(initiateFileDownloadMock).toHaveBeenCalledWith(blob, "file.zip");
    expect(toast.success).toHaveBeenCalled();
  });

  it("handles empty file header", async () => {
    const headers = new Headers();
    headers.set(EMPTY_FILE_HEADER, "true");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers,
      blob: vi.fn(), // should not be called
    });
    await downloadSubmissionFilesUseCase({ formId, submissionId });
    expect(toast.warning).toHaveBeenCalled();
    expect(initiateFileDownloadMock).not.toHaveBeenCalled();
  });

  it("handles fetch error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("fail"));
    await downloadSubmissionFilesUseCase({ formId, submissionId });
    expect(toast.error).toHaveBeenCalled();
    expect(initiateFileDownloadMock).not.toHaveBeenCalled();
  });

  it("handles non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    await downloadSubmissionFilesUseCase({ formId, submissionId });
    expect(toast.error).toHaveBeenCalled();
    expect(initiateFileDownloadMock).not.toHaveBeenCalled();
  });
});
