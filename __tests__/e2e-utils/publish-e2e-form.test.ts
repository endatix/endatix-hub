import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { releaseScreenOutForms } from "../../e2e/utils/e2e-form-release";
import { publishE2eForm } from "../../e2e/utils/form-api";

vi.mock("../../e2e/utils/e2e-form-release", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../e2e/utils/e2e-form-release")>();
  return {
    ...mod,
    releaseScreenOutForms: vi.fn(mod.releaseScreenOutForms),
  };
});

describe("publishE2eForm", () => {
  beforeEach(() => {
    vi.mocked(releaseScreenOutForms).mockClear();
  });

  it("keeps the form when configure fails", async () => {
    // Arrange
    const formId = "form-42";
    const api = {
      forms: {
        create: vi.fn().mockResolvedValue(
          ApiResult.success({ id: formId, name: "x" } as { id: string; name: string }),
        ),
        update: vi.fn().mockResolvedValue(
          ApiResult.serverError("update failed"),
        ),
        delete: vi.fn(),
      },
      put: vi.fn().mockResolvedValue(ApiResult.success(undefined)),
    } as unknown as EndatixApi;

    // Act
    await expect(
      publishE2eForm(api, {
        name: "e2e",
        definitionJson: "{}",
        isPublic: false,
        limitOnePerUser: true,
      }),
    ).rejects.toThrow("Update form failed");

    // Assert
    expect(releaseScreenOutForms).toHaveBeenCalledWith(api, [formId], true);
    expect(api.forms.delete).not.toHaveBeenCalled();
  });
});
