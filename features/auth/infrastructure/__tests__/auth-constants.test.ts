import { describe, expect, it } from "vitest";
import { isTenantPublicAuthPath } from "../auth-constants";

describe("isTenantPublicAuthPath", () => {
  it("allows tenant sign-in and register", () => {
    expect(isTenantPublicAuthPath("/t/xk9mp2qr/signin")).toBe(true);
    expect(isTenantPublicAuthPath("/t/xk9mp2qr/register")).toBe(true);
  });

  it("rejects other /t/ paths", () => {
    expect(isTenantPublicAuthPath("/t/xk9mp2qr/forms")).toBe(false);
    expect(isTenantPublicAuthPath("/t/xk9mp2qr")).toBe(false);
    expect(isTenantPublicAuthPath("/signin")).toBe(false);
  });
});
