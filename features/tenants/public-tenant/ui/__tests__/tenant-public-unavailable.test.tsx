import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Result } from "@/lib/result";
import { TenantPublicUnavailable } from "../tenant-public-unavailable";

function errorResult(message: string, statusCode?: number) {
  const result = Result.error<never>(message, undefined, undefined, {
    statusCode,
  });
  if (!Result.isError(result)) {
    throw new Error("expected an error result");
  }

  return result;
}

describe("TenantPublicUnavailable", () => {
  it("shows not-found copy on a 404 and hides the API message", () => {
    render(
      <TenantPublicUnavailable error={errorResult("Tenant not found", 404)} />,
    );

    expect(screen.getByText("Tenant not found")).toBeTruthy();
    expect(screen.queryByText(/Ask the organization/i)).toBeTruthy();
  });

  it("surfaces the API message for other failures", () => {
    render(
      <TenantPublicUnavailable
        error={errorResult("Failed to load tenant", 500)}
      />,
    );

    expect(screen.getByText("We couldn't load this page")).toBeTruthy();
    expect(screen.getByText("Failed to load tenant")).toBeTruthy();
  });
});
