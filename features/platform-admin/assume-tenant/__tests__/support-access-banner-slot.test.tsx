import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupportAccessBannerSlot } from "../ui/support-access-banner-slot";

vi.mock("../assume-tenant.action", () => ({
  exitAssumeAction: vi.fn(),
}));

const getAssumedTenantName = vi.fn();
vi.mock("../get-assumed-tenant-name.server", () => ({
  getAssumedTenantName: (...args: unknown[]) => getAssumedTenantName(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { error: vi.fn() },
}));

function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.x`;
}

describe("SupportAccessBannerSlot", () => {
  it("renders nothing without a session", () => {
    const { container } = render(<SupportAccessBannerSlot />);

    expect(container.innerHTML).toBe("");
    expect(getAssumedTenantName).not.toHaveBeenCalled();
  });

  it("renders nothing for a normal session, without calling the API", () => {
    const { container } = render(
      <SupportAccessBannerSlot accessToken={unsignedJwt({ sub: "7" })} />,
    );

    expect(container.innerHTML).toBe("");
    expect(getAssumedTenantName).not.toHaveBeenCalled();
  });

  it("shows the banner immediately while the tenant name is still loading", () => {
    getAssumedTenantName.mockReturnValue(new Promise(() => {}));

    render(
      <SupportAccessBannerSlot
        accessToken={unsignedJwt({ sub: "7", act: "7", tid: "99" })}
      />,
    );

    // The fallback is the banner itself, not null: a sticky bar that appears
    // only after the name resolves would shift the page under the reader.
    expect(screen.getByText("Support access")).toBeTruthy();
    expect(getAssumedTenantName).toHaveBeenCalledWith(expect.any(String), "99");
  });
});
