import FilesPage from "@/app/(main)/forms/[formId]/submissions/[submissionId]/files/page";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth";
import { listUserFiles } from "@/features/asset-storage/server";
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
  listUserFiles: vi.fn(),
}));

vi.mock("@/features/asset-storage/use-cases/list-user-files/ui", () => ({
  SubmissionFilesTable: ({
    files,
    formId,
    submissionId,
  }: {
    files: { displayName: string }[];
    formId: string;
    submissionId: string;
  }) => (
    <div data-testid="submission-files-table">
      <span data-testid="form-id">{formId}</span>
      <span data-testid="submission-id">{submissionId}</span>
      <span data-testid="file-count">{files.length}</span>
    </div>
  ),
  SubmissionFilesTableSkeleton: () => (
    <div data-testid="submission-files-table-skeleton">Loading...</div>
  ),
  SubmissionFilesError: ({ message }: { message: string }) => (
    <div data-testid="submission-files-error">{message}</div>
  ),
}));

describe("Submission files page", () => {
  const formId = "f1";
  const submissionId = "s1";
  const mockParams = Promise.resolve({ formId, submissionId });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "u1", name: "Test", email: "test@example.com" },
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: vi.fn().mockResolvedValue(undefined),
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
    vi.mocked(listUserFiles).mockResolvedValue(
      Result.success([
        {
          displayName: "doc.pdf",
          contentType: "application/pdf",
          sizeInBytes: 1024,
          originalFileName: "doc.pdf",
          questionName: "q1",
        },
      ]),
    );
  });

  it("calls auth and authorization", async () => {
    await FilesPage({ params: mockParams });

    expect(authModule.auth).toHaveBeenCalled();
    expect(authFeature.authorization).toHaveBeenCalled();
  });

  it("calls listUserFiles with formId and submissionId from params", async () => {
    await FilesPage({ params: mockParams });

    expect(listUserFiles).toHaveBeenCalledWith(formId, submissionId);
  });

  it("renders page shell with card title and back link", async () => {
    const component = await FilesPage({ params: mockParams });
    let container: HTMLElement;
    await act(async () => {
      const result = render(component);
      container = result.container;
    });
    expect(screen.getByText("Submission files")).toBeDefined();
    expect(screen.getByText(/Back to submission/)).toBeDefined();
    expect(container!.textContent).toContain(`Form ${formId}`);
    expect(container!.textContent).toContain(`Submission ${submissionId}`);
  });

  it("matches snapshot", async () => {
    const component = await FilesPage({ params: mockParams });
    let container: HTMLElement;
    await act(async () => {
      const result = render(component);
      container = result.container;
    });
    expect(container!.firstChild).toMatchSnapshot();
  });

  it("renders error state when listUserFiles returns error", async () => {
    vi.mocked(listUserFiles).mockResolvedValue(
      Result.error("Storage is not enabled"),
    );

    const component = await FilesPage({ params: mockParams });
    let container: HTMLElement;
    await act(async () => {
      const result = render(component);
      container = result.container;
    });

    expect(screen.getByTestId("submission-files-error")).toBeDefined();
    expect(container!.textContent).toContain("Storage is not enabled");
  });
});
