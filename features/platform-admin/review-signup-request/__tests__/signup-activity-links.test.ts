import { afterEach, describe, expect, it } from "vitest";
import { signupActivityLinks } from "../signup-activity-links.server";

describe("signupActivityLinks", () => {
  afterEach(() => {
    delete process.env.POSTHOG_UI_HOST;
    delete process.env.POSTHOG_PROJECT_ID;
  });

  it("returns null unless the host, project, and an id are all present", () => {
    // Act & Assert
    expect(
      signupActivityLinks({
        metadata: JSON.stringify({
          postHogDistinctId: "anon",
          postHogSessionId: "sess",
        }),
      }),
    ).toBeNull();

    process.env.POSTHOG_UI_HOST = "https://us.posthog.com/";
    process.env.POSTHOG_PROJECT_ID = "42";

    expect(
      signupActivityLinks({
        metadata: JSON.stringify({ postHogDistinctId: "anon" }),
      }),
    ).toEqual({
      sessionHref: undefined,
      profileHref: "https://us.posthog.com/project/42/persons/anon",
    });
  });
});
