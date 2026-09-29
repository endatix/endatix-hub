import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSignupVisitorRef,
  toSignupRequestView,
} from "../signup-request-view.server";

vi.mock("server-only", () => ({}));

const METADATA = JSON.stringify({
  postHogDistinctId: "anon-1",
  postHogSessionId: "sess-1",
});

function configurePostHog() {
  process.env.POSTHOG_UI_HOST = "https://us.posthog.com/";
  process.env.POSTHOG_PROJECT_ID = "42";
  process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
}

describe("readSignupVisitorRef", () => {
  afterEach(() => {
    delete process.env.POSTHOG_UI_HOST;
    delete process.env.POSTHOG_PROJECT_ID;
    delete process.env.POSTHOG_PERSONAL_API_KEY;
  });

  it("returns nothing until the read API is configured", () => {
    expect(readSignupVisitorRef(METADATA)).toBeNull();
  });

  it("keeps both ids, and a session id alone is enough", () => {
    // Arrange
    configurePostHog();

    // Act & Assert
    expect(readSignupVisitorRef(METADATA)).toEqual({
      distinctId: "anon-1",
      sessionId: "sess-1",
    });
    expect(
      readSignupVisitorRef(JSON.stringify({ postHogSessionId: "sess-1" })),
    ).toEqual({ distinctId: null, sessionId: "sess-1" });
    expect(readSignupVisitorRef(JSON.stringify({}))).toBeNull();
    expect(readSignupVisitorRef("not json")).toBeNull();
  });

  it("drops the raw metadata from the view the client receives", () => {
    // Arrange
    configurePostHog();

    // Act
    const view = toSignupRequestView({
      id: "1",
      email: "jane@example.com",
      companyName: null,
      status: "pending",
      provisioningStatus: "none",
      rejectionComment: null,
      tenantName: null,
      approvedTenantId: null,
      decidedByUserId: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      modifiedAt: null,
      metadata: METADATA,
    });

    // Assert
    expect("metadata" in view).toBe(false);
    expect(view.visitor).toEqual({ distinctId: "anon-1", sessionId: "sess-1" });
  });
});
