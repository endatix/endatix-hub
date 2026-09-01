import { describe, expect, it } from "vitest";
import { readAssumeSession } from "../read-assume-session";

function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.x`;
}

describe("readAssumeSession", () => {
  it("returns actor and tenant when act is present", () => {
    const token = unsignedJwt({ sub: "7", tid: "99", act: "7" });

    expect(readAssumeSession(token)).toEqual({
      actorUserId: "7",
      tenantId: "99",
    });
  });

  it("returns null for a home-tenant token", () => {
    const token = unsignedJwt({ sub: "7", tid: "1" });

    expect(readAssumeSession(token)).toBeNull();
  });

  it("returns null for missing or invalid tokens", () => {
    expect(readAssumeSession(undefined)).toBeNull();
    expect(readAssumeSession("not-a-jwt")).toBeNull();
  });
});
