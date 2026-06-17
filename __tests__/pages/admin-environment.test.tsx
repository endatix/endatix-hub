import EnvironmentPage from "@/app/(main)/admin/environment/page";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Admin Environment Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the safe storage settings page", () => {
    const result = EnvironmentPage();

    expect(result).toBeNull();
    expect(redirect).toHaveBeenCalledWith("/admin/storage");
  });
});
