import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { rewriteToMaintenance } from "../maintenance-response";

const BASE_URL = "https://example.com";

function createRequest(pathname: string, search = ""): NextRequest {
  const url = `${BASE_URL}${pathname}${search ? `?${search}` : ""}`;
  return new NextRequest(url);
}

describe("rewriteToMaintenance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 without Retry-After when env retry seconds are unset", () => {
    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "");
    const response = rewriteToMaintenance(createRequest("/forms", "x=1"));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  it("sets Retry-After when MAINTENANCE_RETRY_AFTER_SECONDS is valid", () => {
    vi.stubEnv("MAINTENANCE_RETRY_AFTER_SECONDS", "120");
    const response = rewriteToMaintenance(createRequest("/"));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("120");
  });
});
