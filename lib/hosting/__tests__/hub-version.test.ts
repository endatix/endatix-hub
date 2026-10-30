import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveHubBuild, resolveSurveyJsVersions } from "../hub-build.mjs";
import {
  getHubBuild,
  getHubDeploymentId,
  getSurveyJsVersions,
} from "../hub-version";

const SHA = "8ef28cee396f8dfb959d40c34868314585659f28";

/** A fake git that answers per command; a missing answer fails like git does. */
function fakeGit(answers: Record<string, string>) {
  return (args: string[]) => {
    const answer =
      answers[args[0] === "describe" ? "describe" : args.join(" ")];
    if (answer === undefined) {
      throw new Error(`fatal: git ${args.join(" ")}`);
    }
    return `${answer}\n`;
  };
}

describe("resolveHubBuild", () => {
  it.each(["main", "hotfix/0.8.x", "HEAD"])(
    "uses the release tag HEAD sits on, without its v, on %s",
    (branch) => {
      // Act
      const build = resolveHubBuild(
        fakeGit({
          describe: "v0.8.0",
          "rev-parse HEAD": SHA,
          "rev-parse --abbrev-ref HEAD": branch,
        }),
        {},
      );

      // Assert
      expect(build).toEqual({ version: "0.8.0", branch: null, commit: SHA });
    },
  );

  it("treats a feature branch on a tagged commit as a feature build", () => {
    // Act
    const build = resolveHubBuild(
      fakeGit({
        describe: "v0.8.0",
        "rev-parse HEAD": SHA,
        "rev-parse --abbrev-ref HEAD": "feat/h134-show-product-versions",
      }),
      {},
    );

    // Assert
    expect(build).toEqual({
      version: null,
      branch: "feat/h134-show-product-versions",
      commit: SHA,
    });
  });

  it("uses the tag when git names no branch", () => {
    // Act
    const build = resolveHubBuild(
      fakeGit({ describe: "v0.8.0", "rev-parse HEAD": SHA }),
      {},
    );

    // Assert
    expect(build).toEqual({ version: "0.8.0", branch: null, commit: SHA });
  });

  it("identifies a build off a tag by branch and commit", () => {
    // Act
    const build = resolveHubBuild(
      fakeGit({ "rev-parse HEAD": SHA, "rev-parse --abbrev-ref HEAD": "main" }),
      {},
    );

    // Assert
    expect(build).toEqual({ version: null, branch: "main", commit: SHA });
  });

  it("treats a detached tag checkout as a release, not a branch named after the tag", () => {
    // Act
    const build = resolveHubBuild(
      fakeGit({
        describe: "v0.8.0",
        "rev-parse HEAD": SHA,
        "rev-parse --abbrev-ref HEAD": "HEAD",
      }),
      { GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "v0.8.0" },
    );

    // Assert
    expect(build).toEqual({ version: "0.8.0", branch: null, commit: SHA });
  });

  it("takes the branch of a detached checkout from GitHub Actions", () => {
    // Act
    const build = resolveHubBuild(
      fakeGit({ "rev-parse HEAD": SHA, "rev-parse --abbrev-ref HEAD": "HEAD" }),
      {
        GITHUB_HEAD_REF: "",
        GITHUB_REF_NAME: "feat/h134-show-product-versions",
      },
    );

    // Assert
    expect(build.branch).toBe("feat/h134-show-product-versions");
  });

  it("knows nothing without git", () => {
    // Act
    const build = resolveHubBuild(fakeGit({}), {});

    // Assert
    expect(build).toEqual({ version: null, branch: null, commit: null });
  });
});

describe("resolveSurveyJsVersions", () => {
  it("reads each installed package's exact version", () => {
    // Act
    const versions = resolveSurveyJsVersions((name) => ({
      version: name.startsWith("survey-creator") ? "3.2.4" : "3.2.3",
    }));

    // Assert
    expect(versions).toEqual({
      "survey-core": "3.2.3",
      "survey-react-ui": "3.2.3",
      "survey-creator-core": "3.2.4",
      "survey-creator-react": "3.2.4",
      "survey-analytics": "3.2.3",
    });
  });

  it("leaves a package that is not installed as null", () => {
    // Act
    const versions = resolveSurveyJsVersions((name) => {
      if (name === "survey-analytics") {
        throw new Error("ENOENT");
      }
      return { version: "3.2.3" };
    });

    // Assert
    expect(versions["survey-analytics"]).toBeNull();
    expect(versions["survey-core"]).toBe("3.2.3");
  });

  it("reads the versions installed in node_modules, not the package.json ranges", () => {
    // Act & Assert
    expect(resolveSurveyJsVersions()["survey-core"]).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("getSurveyJsVersions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the versions next.config.ts inlined at build", () => {
    // Arrange
    vi.stubEnv(
      "HUB_SURVEYJS_VERSIONS",
      JSON.stringify({ "survey-core": "3.2.3", "survey-analytics": null }),
    );

    // Act
    const versions = getSurveyJsVersions();

    // Assert
    expect(versions["survey-core"]).toBe("3.2.3");
    expect(versions["survey-analytics"]).toBeNull();
    expect(versions["survey-creator-react"]).toBeNull();
  });

  it.each(["", "not json", "[]"])(
    "knows no SurveyJS version when the inlined value is %j",
    (inlined) => {
      // Arrange
      vi.stubEnv("HUB_SURVEYJS_VERSIONS", inlined);

      // Act & Assert
      expect(Object.values(getSurveyJsVersions())).toEqual([
        null,
        null,
        null,
        null,
        null,
      ]);
    },
  );
});

describe("getHubBuild", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads what next.config.ts inlined at build", () => {
    // Arrange
    vi.stubEnv("HUB_VERSION", "");
    vi.stubEnv("HUB_BRANCH", "main");
    vi.stubEnv("HUB_COMMIT", SHA);

    // Act & Assert
    expect(getHubBuild()).toEqual({
      version: null,
      branch: "main",
      commit: SHA,
    });
  });

  it("hashes the build so the skew id is not the semver", () => {
    // Act
    const deploymentId = getHubDeploymentId({
      version: "0.8.0",
      branch: null,
      commit: SHA,
    });

    // Assert
    expect(deploymentId).toHaveLength(12);
    expect(deploymentId).not.toContain("0.8.0");
  });
});
