import { describe, expect, it } from "vitest";
import {
  describeSignupRequest,
  suggestWorkspaceName,
} from "../signup-request-state";

describe("describeSignupRequest", () => {
  it("asks for a decision on a pending request", () => {
    // Act
    const state = describeSignupRequest({
      status: "pending",
      provisioningStatus: "none",
    });

    // Assert
    expect(state.row).toEqual({ tone: "attention", label: "Pending" });
    expect(state.provisioning).toBeNull();
    expect(state.nextStep).toBe("decide");
  });

  it("closes a rejected request without an error tone", () => {
    // Act
    const state = describeSignupRequest({
      status: "rejected",
      provisioningStatus: "none",
    });

    // Assert
    expect(state.row).toEqual({ tone: "off", label: "Rejected" });
    expect(state.nextStep).toBeNull();
  });

  it("surfaces a failed setup on the row and offers a retry", () => {
    // Act
    const state = describeSignupRequest({
      status: "approved",
      provisioningStatus: "failed",
    });

    // Assert
    expect(state.row).toEqual({ tone: "attention", label: "Setup failed" });
    expect(state.decision.label).toBe("Approved");
    expect(state.provisioning).toEqual({ tone: "attention", label: "Failed" });
    expect(state.nextStep).toBe("retry");
  });

  it("shows a running setup as in progress, with nothing to do", () => {
    // Act
    const state = describeSignupRequest({
      status: "approved",
      provisioningStatus: "pending",
    });

    // Assert
    expect(state.row.label).toBe("Setting up");
    expect(state.nextStep).toBeNull();
  });

  it("shows a finished approval as approved", () => {
    // Act
    const state = describeSignupRequest({
      status: "approved",
      provisioningStatus: "succeeded",
    });

    // Assert
    expect(state.row).toEqual({ tone: "on", label: "Approved" });
    expect(state.provisioning).toEqual({ tone: "on", label: "Ready" });
  });
});

describe("suggestWorkspaceName", () => {
  it("prefers the company and falls back to the email's local part", () => {
    expect(
      suggestWorkspaceName({ companyName: " Acme ", email: "a@b.com" }),
    ).toBe("Acme");
    expect(
      suggestWorkspaceName({ companyName: null, email: "jane@b.com" }),
    ).toBe("jane");
  });
});
