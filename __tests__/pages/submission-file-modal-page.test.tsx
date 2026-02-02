import FileModalPage from "@/app/(main)/forms/[formId]/submissions/[submissionId]/files/@modal/(.)[fileName]/page";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth";
import { getUserFile } from "@/features/asset-storage/server";
import { Result } from "@/lib/result";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/forms/f1/submissions/s1/files"),
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
  SubmissionFileModal: ({
    fileResult,
    formId,
    submissionId,
  }: {
    fileResult: {
      kind: number;
      value?: { displayName: string; url: string };
      message?: string;
    };
    formId: string;
    submissionId: string;
  }) => {
    const isError = fileResult.kind === 1;
    return (
      <div data-testid="submission-file-modal">
        <span data-testid="modal-form-id">{formId}</span>
        <span data-testid="modal-submission-id">{submissionId}</span>
        {isError ? (
          <span data-testid="modal-error">{fileResult.message}</span>
        ) : (
          fileResult.value && (
            <>
              <span data-testid="modal-file-display-name">
                {fileResult.value.displayName}
              </span>
              <span data-testid="modal-file-url">{fileResult.value.url}</span>
            </>
          )
        )}
      </div>
    );
  },
}));

describe("Submission file modal page (@modal/(.)[fileName])", () => {
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
    await FileModalPage({ params: mockParams });

    expect(authModule.auth).toHaveBeenCalled();
    expect(authFeature.authorization).toHaveBeenCalled();
  });

  it("calls getUserFile with formId, submissionId, and decoded fileName", async () => {
    await FileModalPage({ params: mockParams });

    expect(getUserFile).toHaveBeenCalledWith(formId, submissionId, fileName);
  });

  it("renders modal with error when getUserFile returns error", async () => {
    vi.mocked(getUserFile).mockResolvedValue(Result.error("File not found"));

    const component = await FileModalPage({ params: mockParams });
    render(component);

    expect(screen.getByTestId("submission-file-modal")).toBeDefined();
    expect(screen.getByTestId("modal-error").textContent).toBe(
      "File not found",
    );
  });

  it("renders modal with file view when getUserFile returns success", async () => {
    const component = await FileModalPage({ params: mockParams });
    render(component);

    expect(screen.getByTestId("submission-file-modal")).toBeDefined();
    expect(screen.getByTestId("modal-form-id").textContent).toBe(formId);
    expect(screen.getByTestId("modal-submission-id").textContent).toBe(
      submissionId,
    );
    expect(screen.getByTestId("modal-file-display-name").textContent).toBe(
      mockFile.displayName,
    );
    expect(screen.getByTestId("modal-file-url").textContent).toBe(mockFile.url);
  });

  it("matches snapshot", async () => {
    const component = await FileModalPage({ params: mockParams });
    let container: HTMLElement;
    await act(async () => {
      const result = render(component);
      container = result.container;
    });
    expect(container!.firstChild).toMatchSnapshot();
  });
});
