import { RemotePattern } from "next/dist/shared/lib/image-config";
import {
  appendEndatixImageRemotePatterns,
  formatRemotePatternsForDisplay,
  getRewriteRuleFor,
  includesRemoteImageHostnames,
} from "@/lib/hosting/next-config-helper";
import { describe, expect, it } from "vitest";

const wildcardRemotePattern: RemotePattern = {
  protocol: "https",
  hostname: "**",
};

describe("includesRemoteImageHostnames", () => {
  it("should do nothing if remotePatterns is undefined", () => {
    const remotePatterns: RemotePattern[] | undefined = undefined;

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toBeUndefined();
  });

  it("should add wildcard hostname if REMOTE_IMAGE_HOSTNAMES is empty", () => {
    process.env.REMOTE_IMAGE_HOSTNAMES = "";
    const remotePatterns: RemotePattern[] = [];

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toEqual([wildcardRemotePattern]);
  });

  it("should add wildcard hostname if REMOTE_IMAGE_HOSTNAMES is undefined", () => {
    delete process.env.REMOTE_IMAGE_HOSTNAMES;
    const remotePatterns: RemotePattern[] = [];

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toEqual([wildcardRemotePattern]);
  });

  it("should add multiple hostnames from comma-separated REMOTE_IMAGE_HOSTNAMES", () => {
    process.env.REMOTE_IMAGE_HOSTNAMES =
      "images.unsplash.com,images.pexels.com";
    const remotePatterns: RemotePattern[] = [];

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ]);
  });

  it("should handle single hostname in REMOTE_IMAGE_HOSTNAMES", () => {
    process.env.REMOTE_IMAGE_HOSTNAMES = "images.unsplash.com";
    const remotePatterns: RemotePattern[] = [];

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ]);
  });

  it("should trim empty strings and whitespace from hostnames", () => {
    process.env.REMOTE_IMAGE_HOSTNAMES =
      "  images.unsplash.com  ,  ,  images.pexels.com  ";
    const remotePatterns: RemotePattern[] = [];

    includesRemoteImageHostnames(remotePatterns);

    expect(remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ]);
  });
});

describe("appendEndatixImageRemotePatterns", () => {
  it("appends storage hostnames after REMOTE_IMAGE_HOSTNAMES patterns", () => {
    process.env.REMOTE_IMAGE_HOSTNAMES = "cdn.example.com";
    const remotePatterns: RemotePattern[] = [];
    appendEndatixImageRemotePatterns(remotePatterns, ["blob.core.windows.net"]);
    expect(remotePatterns).toEqual([
      { protocol: "https", hostname: "cdn.example.com" },
      { protocol: "https", hostname: "blob.core.windows.net" },
    ]);
  });
});

describe("formatRemotePatternsForDisplay", () => {
  it("returns None configured for empty or undefined", () => {
    expect(formatRemotePatternsForDisplay(undefined)).toBe("None configured");
    expect(formatRemotePatternsForDisplay([])).toBe("None configured");
  });

  it("formats RemotePattern entries", () => {
    const text = formatRemotePatternsForDisplay([
      { protocol: "https", hostname: "a.example.com" },
      { protocol: "https", hostname: "**" } as RemotePattern,
    ]);
    expect(text).toBe("https://a.example.com, https://**");
  });
});

describe("getRewriteRuleFor", () => {
  it("should throw an error if the route name is empty", () => {
    expect(() => getRewriteRuleFor("")).toThrow("Invalid route name value");
  });

  it("should throw an error if the route name is whitespace", () => {
    const whitespaceRouteName: string = "   ";
    expect(() => getRewriteRuleFor(whitespaceRouteName)).toThrow(
      "Invalid route name value",
    );
  });

  it("should throw an error if the route name starts with @", () => {
    expect(() => getRewriteRuleFor("@test")).toThrow(
      "Invalid route name value",
    );
  });

  it("should return the correct rewrite rule for a valid route name", () => {
    const validRouteName: string = "breadcrumbs";
    const rewriteRule = getRewriteRuleFor(validRouteName);
    expect(rewriteRule).toEqual({
      source: `/_next/static/chunks/app/:folder*/@breadcrumbs/:path*`,
      destination: `/_next/static/chunks/app/:folder*/%40breadcrumbs/:path*`,
    });
  });
});
