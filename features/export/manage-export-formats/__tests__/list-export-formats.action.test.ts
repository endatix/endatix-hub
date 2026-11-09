import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { listTenantExportFormatsAction } from "../list-export-formats.action";

const mockEvaluatePermissions = vi.fn();
const mockListFormats = vi.fn();

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/features/auth/authorization", () => ({
  Permissions: {
    Tenant: { ManageSettings: "tenant.settings.manage" },
    Submissions: { Export: "submissions.export" },
  },
  authorization: vi.fn().mockResolvedValue({
    evaluatePermissions: (...args: unknown[]) =>
      mockEvaluatePermissions(...args),
  }),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      reporting: { exportFormats: { list: () => mockListFormats() } },
    };
  }),
}));

function grants(manage: boolean, exportGrant: boolean) {
  return {
    success: true,
    data: {
      "tenant.settings.manage": manage,
      "submissions.export": exportGrant,
    },
  };
}

describe("listTenantExportFormatsAction", () => {
  beforeEach(() => {
    mockListFormats.mockResolvedValue(ApiResult.success([]));
  });

  it("lists the formats for a user who may export", async () => {
    // Arrange
    mockEvaluatePermissions.mockResolvedValue(grants(false, true));

    // Act
    const result = await listTenantExportFormatsAction();

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    expect(mockListFormats).toHaveBeenCalled();
  });

  it("says export permission is needed when the user may neither export nor manage settings", async () => {
    // Arrange
    mockEvaluatePermissions.mockResolvedValue(grants(false, false));

    // Act
    const result = await listTenantExportFormatsAction();

    // Assert
    expect(Result.isError(result) && result.message).toBe(
      "You need permission to export submissions.",
    );
    expect(mockListFormats).not.toHaveBeenCalled();
  });

  it("says the check failed, not that permission is missing, when the check errors", async () => {
    // Arrange
    mockEvaluatePermissions.mockResolvedValue(AuthorizationResult.error());

    // Act
    const result = await listTenantExportFormatsAction();

    // Assert
    expect(Result.isError(result) && result.message).toBe(
      "Could not check permission to export submissions.",
    );
    expect(mockListFormats).not.toHaveBeenCalled();
  });
});
