import { describe, expect, it, vi } from "vitest";
import { FormTemplates } from "../../form-templates/form-templates";
import { ApiResult } from "../../shared/api-result";
import type { EndatixApi } from "../../endatix-api";
import type { FormTemplate } from "@/types";
import type { CreateFormTemplateRequest } from "@/lib/form-types";

describe("FormTemplates", () => {
  it("create posts to form-templates endpoint", async () => {
    // Arrange
    const body: CreateFormTemplateRequest = {
      name: "Template",
      jsonData: "{}",
      description: "desc",
      folderId: null,
    };
    const created: FormTemplate = {
      id: "1",
      name: "Template",
      description: "desc",
      createdAt: new Date(),
      folderId: null,
    };
    const post = vi.fn().mockResolvedValue(ApiResult.success(created));
    const sut = new FormTemplates({ post } as unknown as EndatixApi);

    // Act
    const result = await sut.create(body);

    // Assert
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/form-templates", body);
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("list sends default page size without folder filter", async () => {
    // Arrange
    const expected: FormTemplate[] = [];
    const get = vi.fn().mockResolvedValue(ApiResult.success(expected));
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    // Act
    const result = await sut.list();

    // Assert
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/form-templates?pageSize=100");
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("list sends folderId filter when provided", async () => {
    // Arrange
    const expected: FormTemplate[] = [];
    const get = vi.fn().mockResolvedValue(ApiResult.success(expected));
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    // Act
    await sut.list({ folderId: "123" });

    // Assert
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      "/form-templates?pageSize=100&folderId=123",
    );
  });
});
