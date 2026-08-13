import { afterEach, describe, expect, it } from "vitest";
import { getEmbedMessagingContext } from "../embed-messaging-context";

function setUrl(search: string): void {
  window.history.replaceState(null, "", `/embed/123${search}`);
}

describe("getEmbedMessagingContext", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("returns an empty context when no relevant query params are present", () => {
    setUrl("");

    expect(getEmbedMessagingContext()).toEqual({
      embedId: undefined,
      parentOrigin: undefined,
      heightMode: undefined,
    });
  });

  it("parses a valid embedId", () => {
    setUrl("?embedId=edxf-123-0-abc123");

    expect(getEmbedMessagingContext().embedId).toBe("edxf-123-0-abc123");
  });

  it("rejects an embedId with disallowed characters", () => {
    setUrl(`?embedId=${encodeURIComponent("<script>alert(1)</script>")}`);

    expect(getEmbedMessagingContext().embedId).toBeUndefined();
  });

  it("parses a valid http(s) parentOrigin", () => {
    setUrl(
      `?parentOrigin=${encodeURIComponent("https://customer.example")}`,
    );

    expect(getEmbedMessagingContext().parentOrigin).toBe(
      "https://customer.example",
    );
  });

  it("rejects a non-http(s) parentOrigin", () => {
    setUrl(`?parentOrigin=${encodeURIComponent("javascript:alert(1)")}`);

    expect(getEmbedMessagingContext().parentOrigin).toBeUndefined();
  });

  it("rejects a malformed parentOrigin", () => {
    setUrl("?parentOrigin=not-a-url");

    expect(getEmbedMessagingContext().parentOrigin).toBeUndefined();
  });

  it("parses heightMode=fill", () => {
    setUrl("?heightMode=fill");

    expect(getEmbedMessagingContext().heightMode).toBe("fill");
  });

  it("treats an invalid heightMode value as absent (auto)", () => {
    setUrl("?heightMode=bogus");

    expect(getEmbedMessagingContext().heightMode).toBeUndefined();
  });

  it("is case-sensitive for heightMode", () => {
    setUrl("?heightMode=Fill");

    expect(getEmbedMessagingContext().heightMode).toBeUndefined();
  });

  it("parses all three params together", () => {
    setUrl(
      "?embedId=edxf-123-0-abc123&parentOrigin=" +
        encodeURIComponent("https://customer.example") +
        "&heightMode=fill",
    );

    expect(getEmbedMessagingContext()).toEqual({
      embedId: "edxf-123-0-abc123",
      parentOrigin: "https://customer.example",
      heightMode: "fill",
    });
  });
});
