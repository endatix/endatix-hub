import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import type { FormTemplate } from "@/types";
import FormTemplatesList from "../form-templates-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@/components/error-handling/error-page", () => ({
  HubPageLoadError: () => <div data-testid="hub-page-load-error">error</div>,
}));

vi.mock("../form-template-card", () => ({
  default: () => <div>template-card</div>,
}));

vi.mock("../form-template-sheet", () => ({
  default: () => null,
}));

vi.mock("../form-template-preview", () => ({
  FormTemplatePreview: () => null,
}));

function fulfilledPromise<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as Promise<T> & {
    status: "fulfilled";
    value: T;
  };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

describe("FormTemplatesList", () => {
  it("renders HubPageLoadError when templates Result is an error", async () => {
    // Arrange
    const listResult = Result.error<FormTemplate[]>(
      "Network error. Failed to connect to the Endatix API.",
      undefined,
      ERROR_CODE.NETWORK_ERROR,
      { statusCode: 503 },
    );

    // Act
    render(
      <Suspense fallback={<div>loading</div>}>
        <FormTemplatesList templatesPromise={fulfilledPromise(listResult)} />
      </Suspense>,
    );

    // Assert
    expect(await screen.findByTestId("hub-page-load-error")).toBeDefined();
    expect(screen.queryByText("template-card")).toBeNull();
  });
});
