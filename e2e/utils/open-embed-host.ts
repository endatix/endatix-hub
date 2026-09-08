import type { Page } from "@playwright/test";

type OpenEmbedHostOptions = {
  baseURL: string | undefined;
  formId: string;
  heightMode?: "fill";
  containerHeightPx?: number;
};

/**
 * Real embed.js host: WebHost `GET /dev/embed-host?view=bare` when
 * `E2E_EMBED_HOST_URL` is set. Fill-mode layout tests stay on the same-origin
 * mock (fixed 900px parent). Handshake tests use the playground when configured.
 */
export async function openEmbedHost(
  page: Page,
  options: OpenEmbedHostOptions,
): Promise<void> {
  const playground = process.env.E2E_EMBED_HOST_URL;
  const usePlayground = Boolean(playground) && options.heightMode !== "fill";

  if (usePlayground && playground && options.baseURL) {
    const url = new URL("/dev/embed-host", playground);
    url.searchParams.set("formId", options.formId);
    url.searchParams.set("view", "bare");
    url.searchParams.set("hubBaseUrl", options.baseURL);
    await page.goto(url.toString());
    return;
  }

  const path =
    options.heightMode === "fill" ? "/__mock_host_fill__" : "/__mock_host__";
  const heightAttr =
    options.heightMode === "fill" ? ' data-height-mode="fill"' : "";
  const containerPx = options.containerHeightPx ?? 900;
  const body =
    options.heightMode === "fill"
      ? `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Test Host Page (Fill Mode)</title>
                  <style>
                    body { padding: 50px; background: #f0f0f0; font-family: sans-serif; }
                  </style>
                </head>
                <body>
                  <h1>My External Website</h1>
                  <div style="height: ${containerPx}px; border: 1px solid #ccc;">
                    <script
                      src="${options.baseURL}/embed/v1/embed.js"
                      data-form-id="${options.formId}"${heightAttr}>
                    </script>
                  </div>
                </body>
              </html>
            `
      : `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Test Host Page</title>
                  <style>
                    body { padding: 50px; background: #f0f0f0; font-family: sans-serif; }
                    .spacer { height: 1000px; }
                  </style>
                </head>
                <body>
                  <h1>My External Website</h1>
                  <p>The form is embedded below:</p>
                  <script
                    src="${options.baseURL}/embed/v1/embed.js"
                    data-form-id="${options.formId}">
                  </script>
                  <div class="spacer"></div>
                </body>
              </html>
            `;

  await page.route(`${options.baseURL}${path}`, async (route) => {
    await route.fulfill({ contentType: "text/html", body });
  });
  await page.goto(`${options.baseURL}${path}`);
}
