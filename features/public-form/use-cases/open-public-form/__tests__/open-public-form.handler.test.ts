import { ApiResult } from "@/lib/endatix-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openSubmissionOperation = vi.hoisted(() => vi.fn());

vi.mock("@/features/public-form/application/open-submission-operation", () => ({
  openSubmissionOperation,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn() }),
}));

import { openPublicFormHandlers } from "../open-public-form.handler";

const context = (formId: string) => ({ params: Promise.resolve({ formId }) });
const request = (body: string) =>
  new Request("http://hub/api/public/v0/forms/1/submissions/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

describe("openPublicFormHandlers.POST", () => {
  beforeEach(() => {
    openSubmissionOperation.mockReset();
  });

  it("opens the form's submission with the URL token", async () => {
    // Arrange
    openSubmissionOperation.mockResolvedValue(
      ApiResult.success({ submissionId: "42" }),
    );

    // Act
    const response = await openPublicFormHandlers.POST(
      request(JSON.stringify({ urlToken: "token-1" })),
      context("1"),
    );

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ submissionId: "42" });
    expect(openSubmissionOperation).toHaveBeenCalledWith(
      "1",
      expect.anything(),
      "token-1",
    );
  });

  it("refuses a body that is not the open request", async () => {
    // Act
    const response = await openPublicFormHandlers.POST(
      request(JSON.stringify({ urlToken: 7 })),
      context("1"),
    );

    // Assert
    expect(response.status).toBe(400);
    expect(openSubmissionOperation).not.toHaveBeenCalled();
  });

  it("refuses a request without a form", async () => {
    // Act
    const response = await openPublicFormHandlers.POST(
      request("{}"),
      context(""),
    );

    // Assert
    expect(response.status).toBe(400);
    expect(openSubmissionOperation).not.toHaveBeenCalled();
  });
});
