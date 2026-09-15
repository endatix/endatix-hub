import { NextResponse } from "next/server";

function prefersHtml(acceptHeader: string | null): boolean {
  if (!acceptHeader) {
    return false;
  }

  const htmlWeight = acceptHeader.includes("text/html") ? 1 : 0;
  const jsonWeight = acceptHeader.includes("application/json") ? 1 : 0;
  if (htmlWeight && !jsonWeight) {
    return true;
  }

  return (
    htmlWeight > 0 &&
    acceptHeader.indexOf("text/html") < acceptHeader.indexOf("application/json")
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function asBrowserExportError(
  response: NextResponse,
  acceptHeader: string | null,
): Promise<NextResponse> {
  if (!prefersHtml(acceptHeader)) {
    return response;
  }

  const body = (await response.clone().json()) as {
    title?: string;
    detail?: string;
  };
  const title = escapeHtml(body.title || "PDF export failed");
  const detail = escapeHtml(body.detail || "The PDF could not be generated.");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fafafa; color: #171717; }
      main { max-width: 32rem; padding: 2rem; }
      h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.75rem; }
      p { margin: 0; line-height: 1.5; color: #525252; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${detail}</p>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: response.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
