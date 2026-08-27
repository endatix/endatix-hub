import { describe, expect, it, vi } from "vitest";
import {
  FormTemplates,
  buildListFormTemplatesEndpoint,
} from "../../form-templates/form-templates";
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
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: expected,
        page: 1,
        pageSize: 100,
        totalRecords: 0,
        totalPages: 0,
      }),
    );
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    // Act
    const result = await sut.list();

    // Assert
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/form-templates?page=1&pageSize=100");
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("list sends folderId filter when provided", async () => {
    // Arrange
    const expected: FormTemplate[] = [];
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: expected,
        page: 1,
        pageSize: 100,
        totalRecords: 0,
        totalPages: 0,
      }),
    );
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    // Act
    await sut.list({ folderId: "123" });

    // Assert
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      "/form-templates?page=1&pageSize=100&folderId=123",
    );
  });

  it("list sends folderId:null filter when unassignedOnly", async () => {
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: [],
        page: 1,
        pageSize: 100,
        totalRecords: 0,
        totalPages: 0,
      }),
    );
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    await sut.list({ unassignedOnly: true });

    expect(get).toHaveBeenCalledTimes(1);
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain("page=1");
    expect(url).toContain("pageSize=100");
    expect(decodeURIComponent(url)).toContain("filter=folderId:null");
  });

  it("list flattens Paged.items into a FormTemplate array", async () => {
    const items: FormTemplate[] = [
      {
        id: "1",
        name: "A",
        description: undefined,
        createdAt: new Date(),
        folderId: null,
      },
      {
        id: "2",
        name: "B",
        description: undefined,
        createdAt: new Date(),
        folderId: null,
      },
    ];
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        items,
        page: 1,
        pageSize: 100,
        totalRecords: 2,
        totalPages: 1,
      }),
    );
    const sut = new FormTemplates({ get } as unknown as EndatixApi);

    const result = await sut.list({ unassignedOnly: true });

    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(items);
    }
  });
});

describe("buildListFormTemplatesEndpoint", () => {
  it("maps unassignedOnly to filter folderId:null", () => {
    const endpoint = buildListFormTemplatesEndpoint({ unassignedOnly: true });
    expect(decodeURIComponent(endpoint)).toBe(
      "/form-templates?page=1&pageSize=100&filter=folderId:null",
    );
  });
});
