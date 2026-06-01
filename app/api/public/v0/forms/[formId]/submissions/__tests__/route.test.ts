import { ApiResult } from "@/lib/endatix-api";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockCookies, mockSubmitFormOperation, mockTokenStore } = vi.hoisted(
  () => ({
    mockCookies: vi.fn(),
    mockSubmitFormOperation: vi.fn(),
    mockTokenStore: {
      getToken: vi.fn(),
      setToken: vi.fn(),
      deleteToken: vi.fn(),
    },
  }),
);

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(function () {
    return mockTokenStore;
  }),
}));

vi.mock("@/features/public-form/application/submit-form-operation", () => ({
  submitFormOperation: mockSubmitFormOperation,
}));

import { POST } from "../route";

describe("POST /api/public/v0/forms/[formId]/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
  });

  function request(body: unknown): Request {
    return new Request("http://localhost/api/public/v0/forms/123/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("submits form data through shared operation", async () => {
    // Arrange
    const submissionData = { isComplete: true, jsonData: "{}" };
    mockSubmitFormOperation.mockResolvedValue(
      ApiResult.success({ submissionId: "submission-1", isComplete: true }),
    );

    // Act
    const response = await POST(request({ submissionData }), {
      params: Promise.resolve({ formId: "123" }),
    });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual({
      submissionId: "submission-1",
      isComplete: true,
    });
    expect(mockSubmitFormOperation).toHaveBeenCalledWith(
      "123",
      submissionData,
      mockTokenStore,
      undefined,
    );
  });

  it("returns 400 when submission data is missing", async () => {
    // Act
    const response = await POST(request({}), {
      params: Promise.resolve({ formId: "123" }),
    });

    // Assert
    expect(response.status).toBe(400);
    expect(mockSubmitFormOperation).not.toHaveBeenCalled();
  });
});
