import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import {
  countTestSubmissionsAction,
  deleteTestSubmissionsAction,
  setSubmissionTestAction,
} from "../submission-test-flag.action";

const mockRequireAllPermissions = vi.fn();
const mockSetTest = vi.fn();
const mockDeleteTests = vi.fn();
const mockList = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", () => ({
  Permissions: {
    Access: { Hub: "access.hub" },
    Forms: { Test: "forms.test" },
    Submissions: { Delete: "submissions.delete" },
  },
  authorization: vi.fn().mockResolvedValue({
    requireAllPermissions: (...args: unknown[]) =>
      mockRequireAllPermissions(...args),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      submissions: {
        setTest: (...args: unknown[]) => mockSetTest(...args),
        deleteTests: (...args: unknown[]) => mockDeleteTests(...args),
        list: (...args: unknown[]) => mockList(...args),
      },
    };
  }),
}));

describe("setSubmissionTestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(undefined);
    mockSetTest.mockResolvedValue(
      ApiResult.success({ id: "9", isTestSubmission: true }),
    );
  });

  it("needs hub access and forms.test before calling the API", async () => {
    // Arrange
    mockRequireAllPermissions.mockRejectedValue(new Error("NEXT_REDIRECT"));

    // Act
    const call = setSubmissionTestAction("5", "9", true);

    // Assert
    await expect(call).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRequireAllPermissions).toHaveBeenCalledWith([
      "access.hub",
      "forms.test",
    ]);
    expect(mockSetTest).not.toHaveBeenCalled();
  });

  it("marks the submission and revalidates the grid", async () => {
    // Act
    const result = await setSubmissionTestAction("5", "9", true);

    // Assert
    expect(result).toEqual(Result.success({ isTestSubmission: true }));
    expect(mockSetTest).toHaveBeenCalledWith("5", "9", true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/forms/5/submissions");
  });

  it("keeps the submission_exists code and the existing id, and revalidates nothing", async () => {
    // Arrange
    mockSetTest.mockResolvedValue(
      ApiResult.conflictError(
        "A submission already exists for this user and form.",
        { statusCode: 409, existingId: "7" },
        "submission_exists",
      ),
    );

    // Act
    const result = await setSubmissionTestAction("5", "9", false);

    // Assert
    expect(result).toMatchObject({
      errorCode: "submission_exists",
      existingId: "7",
      message: "A submission already exists for this user and form.",
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteTestSubmissionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(undefined);
    mockDeleteTests.mockResolvedValue(ApiResult.success({ deletedCount: 3 }));
  });

  it("needs forms.test and submissions.delete", async () => {
    // Arrange
    mockRequireAllPermissions.mockRejectedValue(new Error("NEXT_REDIRECT"));

    // Act
    const call = deleteTestSubmissionsAction("5");

    // Assert
    await expect(call).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRequireAllPermissions).toHaveBeenCalledWith([
      "access.hub",
      "forms.test",
      "submissions.delete",
    ]);
    expect(mockDeleteTests).not.toHaveBeenCalled();
  });

  it("returns the deleted count and revalidates the grid", async () => {
    // Act
    const result = await deleteTestSubmissionsAction("5");

    // Assert
    expect(result).toEqual(Result.success({ deletedCount: 3 }));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/forms/5/submissions");
  });

  it("passes the API's refusal through", async () => {
    // Arrange
    mockDeleteTests.mockResolvedValue(
      ApiResult.forbiddenError("You cannot delete submissions."),
    );

    // Act
    const result = await deleteTestSubmissionsAction("5");

    // Assert
    expect(Result.isError(result) && result.message).toBe(
      "You cannot delete submissions.",
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("countTestSubmissionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAllPermissions.mockResolvedValue(undefined);
    mockList.mockResolvedValue(
      ApiResult.success({
        items: [],
        page: 1,
        pageSize: 1,
        totalRecords: 4,
        totalPages: 4,
      }),
    );
  });

  it("counts every test submission of the form, whatever its status", async () => {
    // Act
    const result = await countTestSubmissionsAction("5");

    // Assert
    expect(result).toEqual(Result.success(4));
    expect(mockList).toHaveBeenCalledWith("5", {
      isTestSubmission: ["true"],
      page: 1,
      pageSize: 1,
    });
  });
});
