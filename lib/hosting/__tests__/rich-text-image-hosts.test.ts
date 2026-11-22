import { describe, expect, it } from "vitest";
import {
  collectRichTextImageHosts,
  parseRemoteImageHostnames,
} from "../rich-text-image-hosts";

const STORAGE = ["acme.blob.core.windows.net"];

describe("collectRichTextImageHosts", () => {
  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["blank entries only", " , ,"],
  ])(
    "allows only storage hosts when REMOTE_IMAGE_HOSTNAMES is %s",
    (_name, raw) => {
      expect(collectRichTextImageHosts(STORAGE, raw)).toEqual(STORAGE);
    },
  );

  it("adds listed hosts, trimmed, lower-cased and de-duplicated", () => {
    expect(
      collectRichTextImageHosts(
        STORAGE,
        " CDN.example.com ,cdn.example.com, acme.blob.core.windows.net",
      ),
    ).toEqual(["cdn.example.com", "acme.blob.core.windows.net"]);
  });

  it("skips wildcard entries, so nothing means any host", () => {
    expect(
      collectRichTextImageHosts([], "**,*.example.com,cdn.example.com"),
    ).toEqual(["cdn.example.com"]);
  });

  it("is empty with no storage and no listed hosts", () => {
    expect(collectRichTextImageHosts([], undefined)).toEqual([]);
  });
});

describe("parseRemoteImageHostnames", () => {
  it("splits on commas and drops empty entries", () => {
    expect(parseRemoteImageHostnames("a.example, ,b.example:8443,")).toEqual([
      "a.example",
      "b.example:8443",
    ]);
  });
});
