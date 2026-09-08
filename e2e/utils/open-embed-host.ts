import type { Page } from "@playwright/test";

export const EMBED_FILL_CONTAINER_HEIGHT_PX = 900;

type OpenEmbedHostOptions = {
  baseURL: string | undefined;
  formId: string;
  heightMode?: "fill";
  containerHeightPx?: number;
};

export function playgroundEmbedHostHref(
  playgroundOrigin: string,
  formId: string,
  hubBaseUrl: string,
): string {
  const url = new URL("/dev/embed-host", playgroundOrigin);
  url.searchParams.set("formId", formId);
  url.searchParams.set("view", "bare");
  url.searchParams.set("hubBaseUrl", hubBaseUrl);
  return url.toString();
}

/**
 * Host page for embed.js. When `E2E_EMBED_HOST_URL` is set, handshake specs
 * use WebHost `/dev/embed-host?view=bare` (cross-origin). Fill-mode stays on
 * the same-origin mock — playground fill is viewport-sized, not a 900px parent.
 */
export async function openEmbedHost(
  page: Page,
  options: OpenEmbedHostOptions,
): Promise<void> {
  const playground = process.env.E2E_EMBED_HOST_URL;
  if (playground && options.heightMode !== "fill" && options.baseURL) {
    await page.goto(
      playgroundEmbedHostHref(playground, options.formId, options.baseURL),
    );
    return;
  }

  const isFill = options.heightMode === "fill";
  const path = isFill ? "/__mock_host_fill__" : "/__mock_host__";
  const containerPx =
    options.containerHeightPx ?? EMBED_FILL_CONTAINER_HEIGHT_PX;
  const script = `<script src="${options.baseURL}/embed/v1/embed.js" data-form-id="${options.formId}"${isFill ? ' data-height-mode="fill"' : ""}></script>`;
  const body = isFill
    ? `<!DOCTYPE html><html><head><title>Fill host</title></head><body>
        <div style="height: ${containerPx}px; border: 1px solid #ccc;">${script}</div>
      </body></html>`
    : `<!DOCTYPE html><html><head><title>Host</title>
        <style>.spacer { height: 1000px; }</style></head><body>
        ${script}<div class="spacer"></div>
      </body></html>`;

  await page.route(`${options.baseURL}${path}`, async (route) => {
    await route.fulfill({ contentType: "text/html", body });
  });
  await page.goto(`${options.baseURL}${path}`);
}
