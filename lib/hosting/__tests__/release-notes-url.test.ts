import { describe, expect, it } from "vitest";
import { releaseNotesUrl } from "../release-notes-url";

describe("releaseNotesUrl", () => {
  it("points a version at that product's GitHub release tag", () => {
    // Act
    const hub = new URL(releaseNotesUrl("hub", "0.7.7", "about_dialog")!);
    const api = new URL(
      releaseNotesUrl("api", "0.7.7-canary.44", "about_dialog")!,
    );

    // Assert
    expect(`${hub.origin}${hub.pathname}`).toBe(
      "https://github.com/endatix/endatix-hub/releases/tag/v0.7.7",
    );
    expect(`${api.origin}${api.pathname}`).toBe(
      "https://github.com/endatix/endatix/releases/tag/v0.7.7-canary.44",
    );
  });

  it("tags the link with where in the Hub it was opened", () => {
    // Act
    const url = new URL(releaseNotesUrl("hub", "0.7.7", "about_dialog")!);

    // Assert
    expect(url.searchParams.get("utm_source")).toBe("endatix_hub");
    expect(url.searchParams.get("utm_medium")).toBe("about_dialog");
    expect(url.searchParams.get("utm_campaign")).toBe("release_notes");
  });

  it("does not link a blank version", () => {
    // Act & Assert
    expect(releaseNotesUrl("hub", null, "about_dialog")).toBeNull();
    expect(releaseNotesUrl("api", "  ", "about_dialog")).toBeNull();
  });

  it("does not link a local or PR build, which has no release tag", () => {
    // Act & Assert
    expect(releaseNotesUrl("hub", "0.0.0-local", "about_dialog")).toBeNull();
    expect(releaseNotesUrl("api", "0.0.0-ci", "about_dialog")).toBeNull();
  });

  it.each([
    "0.8.0-5-gabc1234",
    "0.8.0-dirty",
    "0.8.0-5-gabc1234-dirty",
    "abc1234",
  ])(
    "does not link a build from source (%s), whose commit may only exist in a fork",
    (version) => {
      // Act & Assert
      expect(releaseNotesUrl("hub", version, "about_dialog")).toBeNull();
    },
  );

  it("links canary and hotfix tags", () => {
    // Act & Assert
    expect(releaseNotesUrl("api", "0.8.1-hotfix.1", "about_dialog")).toContain(
      "/releases/tag/v0.8.1-hotfix.1",
    );
  });
});
