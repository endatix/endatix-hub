/** Max positive signed 64-bit integer (typical snowflake upper bound). */
const MAX_SNOWFLAKE_ID = BigInt("9223372036854775807");

interface EmbedOptions {
  baseUrl?: string;
  token?: string;
  prefill?: string;
}

interface EmbedInstance {
  id: string;
  iframe: HTMLIFrameElement;
  container: HTMLElement;
  formId: string;
  options: EmbedOptions;
  expectedOrigin: string;
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

export const parseUrl = (urlString: string): URL | null => {
  if (
    !urlString ||
    typeof urlString !== "string" ||
    urlString.trim().length === 0
  ) {
    console.warn("urlString must be a non-empty string");
    return null;
  }

  try {
    const parsedUrl = new URL(urlString);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      console.warn("urlString protocol must be http or https");
      return null;
    }
    return parsedUrl;
  } catch {
    console.warn("Invalid urlString format");
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

    const instanceId = `endatix-form-${validatedFormId}-${this.instances.length}`;

    const iframe = document.createElement("iframe");
    iframe.id = instanceId;
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

    let src = `${embedProtocol}//${resolvedUrl.host}/embed/${validatedFormId}`;

    if (options.token) {
      src += `?token=${encodeURIComponent(options.token)}`;
    } else if (options.prefill) {
      src += `?${options.prefill}`;
    }

    iframe.src = src;
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
      id: instanceId,
      iframe,
      container,
      formId: validatedFormId,
      options,
      expectedOrigin: resolvedUrl.origin,
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
      if (!instance?.iframe || event.origin !== instance.expectedOrigin) {
        return;
      }

      const { type } = event.data;
      if (typeof type !== "string") {
        return;
      }

      console.debug("Endatix Embed: Message received", event.data);

      if (type === "endatix:resize") {
        const height = event.data.height;
        if (
          typeof height === "number" &&
          Number.isFinite(height) &&
          height >= 0
        ) {
          instance.iframe.style.height = `${height}px`;
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
        if (typeof url === "string" && url.length > 0) {
          globalThis.window.location.href = url;
        }
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
