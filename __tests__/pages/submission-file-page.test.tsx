import FilePage from "@/app/(main)/forms/[formId]/submissions/[submissionId]/files/[fileName]/page";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth";
import { getUserFile } from "@/features/asset-storage/server";
import { Result } from "@/lib/result";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/features/asset-storage/server", () => ({
  getUserFile: vi.fn(),
}));

vi.mock("@/features/asset-storage/use-cases/get-user-file/ui", () => ({
  SubmissionFileView: ({
    file,
    formId,
    submissionId,
  }: {
    file: { displayName: string; url: string };
    formId: string;
    submissionId: string;
  }) => (
    <div data-testid="submission-file-view">
      <span data-testid="form-id">{formId}</span>
      <span data-testid="submission-id">{submissionId}</span>
      <span data-testid="file-display-name">{file.displayName}</span>
      <span data-testid="file-url">{file.url}</span>
    </div>
  ),
}));

vi.mock("@/components/error-handling/not-found", () => ({
  NotFoundComponent: ({
    notFoundTitle,
    notFoundMessage,
    children,
  }: {
    notFoundTitle: string;
    notFoundMessage: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="not-found">
      <span data-testid="not-found-title">{notFoundTitle}</span>
      <span data-testid="not-found-message">{notFoundMessage}</span>
      {children}
    </div>
  ),
}));

describe("Submission file page ([fileName])", () => {
  const formId = "f1";
  const submissionId = "s1";
  const fileName = "doc.pdf";
  const mockParams = Promise.resolve({ formId, submissionId, fileName });
  const mockFile = {
    displayName: "doc.pdf",
    contentType: "application/pdf",
    sizeInBytes: 1024,
    originalFileName: "doc.pdf",
    questionName: "q1",
    url: "https://account.blob.core.windows.net/user-files/s/f1/s1/doc.pdf?sig=abc",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "u1", name: "Test", email: "test@example.com" },
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: vi.fn().mockResolvedValue(undefined),
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
    vi.mocked(getUserFile).mockResolvedValue(Result.success(mockFile));
  });

  it("calls auth and authorization", async () => {
    await FilePage({ params: mockParams });

    expect(authModule.auth).toHaveBeenCalled();
    expect(authFeature.authorization).toHaveBeenCalled();
  });

  it("calls getUserFile with formId, submissionId, and decoded fileName", async () => {
    await FilePage({ params: mockParams });

    expect(getUserFile).toHaveBeenCalledWith(formId, submissionId, fileName);
  });

  it("calls getUserFile with decoded fileName when param is encoded", async () => {
    const encodedFileName = "file%20name.pdf";
    await FilePage({
      params: Promise.resolve({
        formId,
        submissionId,
        fileName: encodedFileName,
      }),
    });

    expect(getUserFile).toHaveBeenCalledWith(
      formId,
      submissionId,
      "file name.pdf",
    );
  });

  it("renders not found when getUserFile returns error", async () => {
    vi.mocked(getUserFile).mockResolvedValue(Result.error("File not found"));

    const component = await FilePage({ params: mockParams });
    render(component);

    expect(screen.getByTestId("not-found")).toBeDefined();
    expect(screen.getByTestId("not-found-title").textContent).toBe(
      "File not found",
    );
    expect(screen.getByTestId("not-found-message").textContent).toBe(
      "File not found",
    );
    expect(screen.getByText(/Back to files/)).toBeDefined();
  });

  it("renders SubmissionFileView when getUserFile returns success", async () => {
    const component = await FilePage({ params: mockParams });
    render(component);

    expect(screen.getByTestId("submission-file-view")).toBeDefined();
    expect(screen.getByTestId("form-id").textContent).toBe(formId);
    expect(screen.getByTestId("submission-id").textContent).toBe(submissionId);
    expect(screen.getByTestId("file-display-name").textContent).toBe(
      mockFile.displayName,
    );
    expect(screen.getByTestId("file-url").textContent).toBe(mockFile.url);
  });

  it("matches snapshot", async () => {
    const component = await FilePage({ params: mockParams });
    let container: HTMLElement;
    await act(async () => {
      const result = render(component);
      container = result.container;
    });
    expect(container!.firstChild).toMatchSnapshot();
  });
});
