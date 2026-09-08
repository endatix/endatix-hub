import type { Page } from "@playwright/test";

export const EMBED_FILL_CONTAINER_HEIGHT_PX = 900;

export interface OpenEmbedHostOptions {
  formId: string;
  /** Hub origin that serves `/embed/v1/embed.js` (Playwright `baseURL`). */
  hubOrigin: string;
  heightMode?: "auto" | "fill";
}

/**
 * Opens a third-party embed host.
 * Set `E2E_EMBED_HOST_URL` to the WebHost origin or `/dev/embed-host` URL (cross-origin).
 * Unset: same-origin Playwright mock (no `parentOrigin` from a second host).
 */
export async function openEmbedHost(
  page: Page,
  options: OpenEmbedHostOptions,
): Promise<void> {
  const playground = process.env.E2E_EMBED_HOST_URL?.trim();
  if (playground) {
    const url = toEmbedHostUrl(playground);
    url.searchParams.set("formId", options.formId);
    url.searchParams.set("hubBaseUrl", options.hubOrigin);
    if (options.heightMode === "fill") {
      url.searchParams.set("heightMode", "fill");
    }
    await page.goto(url.toString());
    return;
  }

  await openSameOriginMock(page, options);
}

function toEmbedHostUrl(raw: string): URL {
  const url = new URL(raw);
  if (!url.pathname.includes("embed-host")) {
    url.pathname = "/dev/embed-host";
  }
  return url;
}

async function openSameOriginMock(
  page: Page,
  options: OpenEmbedHostOptions,
): Promise<void> {
  const path =
    options.heightMode === "fill" ? "/__mock_host_fill__" : "/__mock_host__";
  const fillWrapStart =
    options.heightMode === "fill"
      ? `<div style="height: ${EMBED_FILL_CONTAINER_HEIGHT_PX}px; border: 1px solid #ccc;">`
      : "";
  const fillWrapEnd = options.heightMode === "fill" ? "</div>" : "";
  const heightAttr =
    options.heightMode === "fill" ? ' data-height-mode="fill"' : "";

  await page.route(`${options.hubOrigin}${path}`, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: `<!DOCTYPE html>
<html>
  <head><title>Embed host</title></head>
  <body>
    ${fillWrapStart}
    <script src="${options.hubOrigin}/embed/v1/embed.js" data-form-id="${options.formId}"${heightAttr}></script>
    ${fillWrapEnd}
    <div style="height:1000px"></div>
  </body>
</html>`,
    });
  });

  await page.goto(`${options.hubOrigin}${path}`);
}
