/** Max positive signed 64-bit integer (typical snowflake upper bound). */
const MAX_SNOWFLAKE_ID = BigInt("9223372036854775807");
const MAX_IFRAME_HEIGHT = 10_000;
const EMBED_ID_QUERY_PARAM = "embedId";
const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";

interface EmbedOptions {
  baseUrl?: string;
  token?: string;
  prefill?: string;
}

interface EmbedInstance {
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  formId: string;
  options: EmbedOptions;
  expectedOrigin: string;
  embedId: string;
}

interface ParseResult {
  isValid: boolean;
  id: bigint | null;
  error: string | null;
}

interface EndatixEmbedApi {
  version: string;
  loaded: boolean;
  instances: EmbedInstance[];
  getDefaultBaseUrl(): string;
  embedFormAt(
    formId: string,
    options: EmbedOptions,
    targetScript: HTMLScriptElement | null,
  ): void;
  findInstanceBySource(source: Window): EmbedInstance | null;
  setupMessageListener(): void;
}

declare global {
  var EndatixEmbed: EndatixEmbedApi | undefined;
}

interface ParseUrlOptions {
  allowRootRelative?: boolean;
  baseUrl?: string;
  warn?: boolean;
}

function warnIfEnabled(message: string, enabled: boolean): void {
  if (enabled) {
    console.warn(message);
  }
}

export const parseUrl = (
  urlString: string,
  options: ParseUrlOptions = {},
): URL | null => {
  const shouldWarn = options.warn ?? true;
  if (
    !urlString ||
    typeof urlString !== "string" ||
    urlString.trim().length === 0
  ) {
    warnIfEnabled("urlString must be a non-empty string", shouldWarn);
    return null;
  }

  const trimmedUrl = urlString.trim();
  if (trimmedUrl.startsWith("//")) {
    warnIfEnabled("urlString must not be protocol-relative", shouldWarn);
    return null;
  }

  const isRootRelativeUrl = trimmedUrl.startsWith("/");
  if (isRootRelativeUrl && (!options.allowRootRelative || !options.baseUrl)) {
    warnIfEnabled("urlString must be an absolute URL", shouldWarn);
    return null;
  }

  try {
    const parsedUrl = isRootRelativeUrl
      ? new URL(trimmedUrl, options.baseUrl)
      : new URL(trimmedUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      warnIfEnabled("urlString protocol must be http or https", shouldWarn);
      return null;
    }
    return parsedUrl;
  } catch {
    warnIfEnabled("Invalid urlString format", shouldWarn);
    return null;
  }
};

export const parseNumericId = (
  idString: string,
  paramName: string,
): ParseResult => {
  if (!paramName || typeof paramName !== "string") {
    return {
      isValid: false,
      id: null,
      error: "paramName must be a non-empty string",
    };
  }

  if (!idString || typeof idString !== "string") {
    return {
      isValid: false,
      id: null,
      error: `${paramName} must be a non-empty string`,
    };
  }

  try {
    const id = BigInt(idString);
    if (id <= 0 || id > MAX_SNOWFLAKE_ID) {
      return {
        isValid: false,
        id: null,
        error: `${paramName} must be a positive number and less than ${MAX_SNOWFLAKE_ID}`,
      };
    }

    return {
      isValid: true,
      id,
      error: null,
    };
  } catch {
    return {
      isValid: false,
      id: null,
      error: `${paramName} must be a valid numeric value`,
    };
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getHttpOrigin(value: string): string | null {
  return parseUrl(value, { warn: false })?.origin ?? null;
}

function getCurrentParentOrigin(): string | null {
  const origin = globalThis.window?.location?.origin;
  return origin ? getHttpOrigin(origin) : null;
}

function createEmbedId(formId: string, index: number): string {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 12);

  return `edxf-${formId}-${index}-${randomValue}`;
}

function appendSearchParams(url: URL, query: string): void {
  const searchParams = new URLSearchParams(
    query.startsWith("?") ? query.slice(1) : query,
  );
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function getSafeNavigationHref(urlString: string): string | null {
  return (
    parseUrl(urlString, {
      allowRootRelative: true,
      baseUrl: globalThis.window.location.origin,
      warn: false,
    })?.href ?? null
  );
}

function isTrustedMessage(
  event: MessageEvent,
  instance: EmbedInstance | null,
): instance is EmbedInstance {
  return Boolean(
    instance?.iframe &&
    event.origin === instance.expectedOrigin &&
    isRecord(event.data) &&
    event.data.embedId === instance.embedId,
  );
}

function dispatchEmbedEvent(
  instance: EmbedInstance,
  type: string,
  detail: Record<string, unknown>,
): void {
  const eventDetail = {
    ...detail,
    formId: instance.formId,
    embedId: instance.embedId,
  };
  const event = new CustomEvent(type, { detail: eventDetail });

  instance.container.dispatchEvent(event);
  globalThis.window.dispatchEvent(
    new CustomEvent(type, { detail: eventDetail }),
  );
}

const endatixEmbed: EndatixEmbedApi = {
  version: "1.0.0",
  loaded: true,
  instances: [],
  getDefaultBaseUrl(): string {
    const currentScript = document.currentScript as HTMLScriptElement | null;
    return currentScript?.src ?? "";
  },
  embedFormAt(
    formId: string,
    options: EmbedOptions,
    targetScript: HTMLScriptElement | null,
  ): void {
    const parsedFormId = parseNumericId(formId, "formId");
    if (!parsedFormId.isValid || parsedFormId.id === null) {
      console.error(parsedFormId.error);
      return;
    }
    const validatedFormId = parsedFormId.id.toString();

    const container = document.createElement("div");
    container.dataset.endatixForm = validatedFormId;
    container.dataset.endatixLoaded = "true";

    if (targetScript?.parentNode) {
      targetScript.parentNode.insertBefore(container, targetScript.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    const embedId = createEmbedId(validatedFormId, this.instances.length);

    const iframe = document.createElement("iframe");
    iframe.id = embedId;
    iframe.dataset.embedId = embedId;
    iframe.dataset.formId = validatedFormId;
    const baseUrl = options.baseUrl || this.getDefaultBaseUrl();

    let resolvedUrl = parseUrl(baseUrl);
    if (!resolvedUrl) {
      console.warn("No valid baseUrl passed. Falling back to default.");
      resolvedUrl = parseUrl(this.getDefaultBaseUrl());
    }
    if (!resolvedUrl) {
      console.error("Cannot auto-resolve valid base URL. Cannot embed form");
      return;
    }

    const embedProtocol = resolvedUrl.protocol;
    if (
      embedProtocol !== globalThis.window.location.protocol &&
      embedProtocol !== "https:"
    ) {
      console.warn(
        "Endatix embed form protocol does not match current protocol.",
      );
    }

    const iframeUrl = new URL(
      `${embedProtocol}//${resolvedUrl.host}/embed/${validatedFormId}`,
    );

    if (options.token) {
      iframeUrl.searchParams.set("token", options.token);
    } else if (options.prefill) {
      appendSearchParams(iframeUrl, options.prefill);
    }

    const parentOrigin = getCurrentParentOrigin();
    if (parentOrigin) {
      iframeUrl.searchParams.set(PARENT_ORIGIN_QUERY_PARAM, parentOrigin);
    }
    iframeUrl.searchParams.set(EMBED_ID_QUERY_PARAM, embedId);

    iframe.src = iframeUrl.toString();
    iframe.allow = "clipboard-write";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.loading = "lazy";
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";
    iframe.style.height = "400px";

    container.appendChild(iframe);

    this.instances.push({
      iframe,
      container,
      formId: validatedFormId,
      options,
      expectedOrigin: resolvedUrl.origin,
      embedId,
    });
  },
  findInstanceBySource(source: Window): EmbedInstance | null {
    for (const instance of this.instances) {
      if (instance.iframe.contentWindow === source) {
        return instance;
      }
    }
    return null;
  },
  setupMessageListener(): void {
    globalThis.window.addEventListener("message", (event) => {
      if (!isRecord(event.data) || !event.source) {
        return;
      }

      const instance = this.findInstanceBySource(event.source as Window);
      if (!isTrustedMessage(event, instance)) {
        return;
      }

      const { type } = event.data;
      if (typeof type !== "string") {
        return;
      }

      if (type === "endatix:resize") {
        const height = event.data.height;
        if (
          typeof height === "number" &&
          Number.isFinite(height) &&
          height >= 0
        ) {
          const clampedHeight = Math.min(Math.ceil(height), MAX_IFRAME_HEIGHT);
          instance.iframe.style.height = `${clampedHeight}px`;
        }
        return;
      }

      if (type === "endatix:scroll") {
        requestAnimationFrame(() => {
          instance.iframe.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
        return;
      }

      if (type === "endatix:navigate") {
        const url = event.data.url;
        const href =
          typeof url === "string" ? getSafeNavigationHref(url) : null;
        if (href) {
          globalThis.window.location.href = href;
        } else {
          console.warn("Endatix Embed: Blocked unsafe navigation URL", url);
        }
        return;
      }

      if (type === "endatix:form-loaded") {
        dispatchEmbedEvent(instance, type, {
          definitionId: toStringValue(event.data.definitionId),
          limitOnePerUser: toBooleanValue(event.data.limitOnePerUser),
          requiresReCaptcha: toBooleanValue(event.data.requiresReCaptcha),
          metadata: toStringValue(event.data.metadata),
          title: toStringValue(event.data.title),
        });
        return;
      }

      if (type === "endatix:form-complete") {
        const submissionId = toStringValue(event.data.submissionId);
        if (!submissionId || event.data.success !== true) {
          return;
        }

        dispatchEmbedEvent(instance, type, {
          submissionId,
          success: true,
          isComplete: toBooleanValue(event.data.isComplete),
          status: toStringValue(event.data.status),
          completedAt: toStringValue(event.data.completedAt),
        });
        return;
      }

      if (type === "endatix:form-error") {
        const error = event.data.error;
        if (!isRecord(error) || event.data.success !== false) {
          return;
        }

        const message = toStringValue(error.message);
        if (!message) {
          return;
        }

        dispatchEmbedEvent(instance, type, {
          success: false,
          error: {
            type: toStringValue(error.type),
            code: toStringValue(error.code),
            message,
          },
        });
      }
    });
  },
};

if (!globalThis.EndatixEmbed && globalThis.window) {
  globalThis.EndatixEmbed = endatixEmbed;
  globalThis.EndatixEmbed.setupMessageListener();

  const currentScript = document.currentScript as HTMLScriptElement | null;
  const formId = currentScript?.dataset.formId;
  if (formId && currentScript) {
    const { baseUrl, prefill, token } = currentScript.dataset;
    const options: EmbedOptions = {
      baseUrl: baseUrl || globalThis.EndatixEmbed.getDefaultBaseUrl() || "",
      prefill: prefill || "",
      token: token || "",
    };

    const embed = () => {
      globalThis.EndatixEmbed?.embedFormAt(formId, options, currentScript);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", embed, { once: true });
    } else {
      embed();
    }
  }

  Object.seal(globalThis.EndatixEmbed);
}

export type { EndatixEmbedApi, EmbedOptions, EmbedInstance };
