import { describe, expect, it } from "vitest";
import { parseSignupRequestsListParams } from "../parse-signup-requests-params";

describe("parseSignupRequestsListParams", () => {
  it("defaults to pending, createdAt, and desc", () => {
    expect(parseSignupRequestsListParams()).toMatchObject({
      status: "pending",
      sortBy: "createdAt",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
    });
  });

  it("keeps approved, rejected, and all", () => {
    expect(parseSignupRequestsListParams({ status: "approved" }).status).toBe(
      "approved",
    );
    expect(parseSignupRequestsListParams({ status: "rejected" }).status).toBe(
      "rejected",
    );
    expect(parseSignupRequestsListParams({ status: "all" }).status).toBe("all");
  });

  it("drops an unknown status back to pending", () => {
    expect(parseSignupRequestsListParams({ status: "nope" }).status).toBe(
      "pending",
    );
  });
});
