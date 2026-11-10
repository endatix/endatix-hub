import type { ResolvingMetadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { getWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { generateMetadata } from "../page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/features/auth/authorization", () => ({ authorization: vi.fn() }));
vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({
  getWorkspaceForm: vi.fn(),
}));
vi.mock("@/features/forms/form-workspace", () => ({
  FormWorkspaceHeader: () => null,
}));
vi.mock("@/features/submissions/list-submissions", () => ({
  SubmissionListSection: () => null,
}));
vi.mock("@/features/submissions/browse-submissions", () => ({
  SubmissionGridSection: () => null,
  SubmissionGridSkeleton: () => null,
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: vi.fn(),
}));

const args = {
  params: Promise.resolve({ formId: "1001" }),
  searchParams: Promise.resolve({}),
};
const parent = Promise.resolve({ title: null }) as unknown as ResolvingMetadata;

describe("Submissions page guard", () => {
  const requireHubAccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({ requireHubAccess } as never);
  });

  it("stops before loading the form when the user has no Hub access", async () => {
    // Arrange
    const denied = new Error("NEXT_REDIRECT");
    requireHubAccess.mockRejectedValue(denied);

    // Act & Assert
    await expect(generateMetadata(args, parent)).rejects.toBe(denied);
    expect(getWorkspaceForm).not.toHaveBeenCalled();
  });

  it("loads the form once the user has Hub access", async () => {
    // Arrange
    requireHubAccess.mockResolvedValue(undefined);
    vi.mocked(getWorkspaceForm).mockResolvedValue({
      success: true,
      data: { name: "Customer feedback" },
    } as never);

    // Act
    const metadata = await generateMetadata(args, parent);

    // Assert
    expect(requireHubAccess).toHaveBeenCalledOnce();
    expect(metadata.title).toBe("Submissions for Customer feedback");
  });
});
