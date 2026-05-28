import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TestEmbedInstance = {
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  expectedOrigin: string;
  embedId: string;
};

type TestEmbedApi = {
  instances: TestEmbedInstance[];
  embedFormAt(
    formId: string,
    options: { baseUrl?: string; token?: string; prefill?: string },
    targetScript: HTMLScriptElement | null,
  ): void;
};

type TestEmbedModule = typeof import("./embed");

async function loadEmbedModule(): Promise<TestEmbedModule> {
  vi.resetModules();
  delete (globalThis as { EndatixEmbed?: unknown }).EndatixEmbed;
  return import("./embed");
}

async function loadEmbedApi(): Promise<TestEmbedApi> {
  await loadEmbedModule();
  return (globalThis as { EndatixEmbed: TestEmbedApi }).EndatixEmbed;
}

function dispatchMessage(
  instance: TestEmbedInstance,
  data: unknown,
  origin = instance.expectedOrigin,
): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin,
      source: instance.iframe.contentWindow,
    }),
  );
}

describe("Endatix embed host script", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    delete (globalThis as { EndatixEmbed?: unknown }).EndatixEmbed;
  });

  it("normalizes safe navigation URLs and blocks unsafe URLs", async () => {
    // Arrange
    const { getSafeNavigationHref } = await loadEmbedModule();

    // Act / Assert
    expect(getSafeNavigationHref(" https://example.com/thank-you ")).toBe(
      "https://example.com/thank-you",
    );
    expect(getSafeNavigationHref("/thank-you?source=embed")).toBe(
      `${window.location.origin}/thank-you?source=embed`,
    );
    expect(getSafeNavigationHref("javascript:alert(1)")).toBeNull();
    expect(getSafeNavigationHref("//evil.example/path")).toBeNull();
    expect(getSafeNavigationHref("thank-you")).toBeNull();
  });

  it("parses only safe HTTP URLs with optional root-relative support", async () => {
    // Arrange
    const { parseUrl } = await loadEmbedModule();

    // Act / Assert
    expect(parseUrl("https://hub.example/embed/v1/embed.js")?.origin).toBe(
      "https://hub.example",
    );
    expect(parseUrl("/thank-you", { warn: false })).toBeNull();
    expect(
      parseUrl("/thank-you", {
        allowRootRelative: true,
        baseUrl: "https://host.example",
      })?.href,
    ).toBe("https://host.example/thank-you");
    expect(parseUrl("javascript:alert(1)", { warn: false })).toBeNull();
    expect(parseUrl("//evil.example/path", { warn: false })).toBeNull();
  });

  it("adds parent origin and embed id to iframe URLs", async () => {
    // Arrange
    const api = await loadEmbedApi();

    // Act
    api.embedFormAt(
      "123",
      { baseUrl: "https://hub.example/embed/v1/embed.js" },
      null,
    );

    // Assert
    const instance = api.instances[0];
    const iframeUrl = new URL(instance.iframe.src);

    expect(iframeUrl.origin).toBe("https://hub.example");
    expect(iframeUrl.pathname).toBe("/embed/123");
    expect(instance.iframe.id).toBe(instance.embedId);
    expect(iframeUrl.searchParams.get("parentOrigin")).toBe(
      window.location.origin,
    );
    expect(iframeUrl.searchParams.get("embedId")).toBe(instance.embedId);
  });

  it("dispatches form-loaded events only for trusted message envelopes", async () => {
    // Arrange
    const api = await loadEmbedApi();
    api.embedFormAt(
      "123",
      { baseUrl: "https://hub.example/embed/v1/embed.js" },
      null,
    );
    const instance = api.instances[0];
    const listener = vi.fn();

    instance.container.addEventListener("endatix:form-loaded", listener);

    // Act
    dispatchMessage(instance, {
      type: "endatix:form-loaded",
      embedId: "forged-id",
      definitionId: "def-123",
      limitOnePerUser: true,
    });
    dispatchMessage(
      instance,
      {
        type: "endatix:form-loaded",
        embedId: instance.embedId,
        definitionId: "evil-def",
        limitOnePerUser: true,
      },
      "https://evil.example",
    );
    dispatchMessage(instance, {
      type: "endatix:form-loaded",
      embedId: instance.embedId,
      definitionId: "def-123",
      limitOnePerUser: true,
      requiresReCaptcha: false,
      metadata: "{\"source\":\"test\"}",
      title: "Customer Intake",
    });

    // Assert
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      detail: {
        formId: "123",
        embedId: instance.embedId,
        definitionId: "def-123",
        limitOnePerUser: true,
        requiresReCaptcha: false,
        metadata: "{\"source\":\"test\"}",
        title: "Customer Intake",
      },
    });
  });

  it("clamps resize messages from trusted iframes", async () => {
    // Arrange
    const api = await loadEmbedApi();
    api.embedFormAt(
      "123",
      { baseUrl: "https://hub.example/embed/v1/embed.js" },
      null,
    );
    const instance = api.instances[0];

    // Act
    dispatchMessage(instance, {
      type: "endatix:resize",
      embedId: instance.embedId,
      height: 20000,
    });

    // Assert
    expect(instance.iframe.style.height).toBe("10000px");
  });

  it("navigates only to safe URLs from trusted iframes", async () => {
    // Arrange
    const api = await loadEmbedApi();
    api.embedFormAt(
      "123",
      { baseUrl: "https://hub.example/embed/v1/embed.js" },
      null,
    );
    const instance = api.instances[0];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // Act
    dispatchMessage(instance, {
      type: "endatix:navigate",
      embedId: instance.embedId,
      url: "javascript:alert(1)",
    });
    dispatchMessage(instance, {
      type: "endatix:navigate",
      embedId: instance.embedId,
      url: "/#thank-you",
    });

    // Assert
    expect(warn).toHaveBeenCalledWith(
      "Endatix Embed: Blocked unsafe navigation URL",
      "javascript:alert(1)",
    );
    expect(window.location.href).toBe(`${window.location.origin}/#thank-you`);
  });

  it("dispatches form-complete and form-error events for trusted messages", async () => {
    // Arrange
    const api = await loadEmbedApi();
    api.embedFormAt(
      "123",
      { baseUrl: "https://hub.example/embed/v1/embed.js" },
      null,
    );
    const instance = api.instances[0];
    const completeListener = vi.fn();
    const errorListener = vi.fn();

    window.addEventListener("endatix:form-complete", completeListener);
    instance.container.addEventListener("endatix:form-error", errorListener);

    // Act
    dispatchMessage(instance, {
      type: "endatix:form-complete",
      embedId: instance.embedId,
      submissionId: "submission-123",
      success: true,
      isComplete: true,
      status: "completed",
      completedAt: "2026-05-26T12:00:00.000Z",
    });
    dispatchMessage(instance, {
      type: "endatix:form-error",
      embedId: instance.embedId,
      success: false,
      error: {
        type: "submission",
        code: "save_failed",
        message: "The form could not be submitted.",
      },
    });

    // Assert
    expect(completeListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          formId: "123",
          embedId: instance.embedId,
          submissionId: "submission-123",
          success: true,
          isComplete: true,
          status: "completed",
          completedAt: "2026-05-26T12:00:00.000Z",
        },
      }),
    );
    expect(errorListener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          formId: "123",
          embedId: instance.embedId,
          success: false,
          error: {
            type: "submission",
            code: "save_failed",
            message: "The form could not be submitted.",
          },
        },
      }),
    );

    window.removeEventListener("endatix:form-complete", completeListener);
  });
});
