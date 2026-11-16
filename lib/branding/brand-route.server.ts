import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Brand } from "./index";
import { resolveDeploymentBrand } from "./effective-brand.server";

const CACHE_CONTROL = "public, max-age=300";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

/** Fixed names for code that cannot await the brand (`global-error.tsx` is a client root). */
const ALIASES: Readonly<Record<string, (brand: Brand) => string>> = {
  icon: (brand) => brand.icon,
  "logo-light": (brand) => brand.logo.light,
  "logo-dark": (brand) => brand.logo.dark,
};

/**
 * GET /brand/<path>. Serves the deployment brand only: the `brand.css`, `icon`,
 * `logo-light` and `logo-dark` aliases, and the files the pack's brand.json
 * names (nothing else in the folder, brand.json included).
 */
export async function brandRouteResponse(
  segments: readonly string[],
  request: Request,
): Promise<Response> {
  const { brand, pack } = await resolveDeploymentBrand();
  const name = segments.join("/");
  const etag = `"${pack?.fingerprint ?? "built-in"}"`;

  if (name === "brand.css")
    return cached(request, etag, () => stylesheetResponse(brand));
  const alias = ALIASES[name];
  if (alias) return redirectTo(alias(brand));

  const file = pack?.files.get(name);
  const mime = MIME_TYPES[path.extname(name).toLowerCase()];
  if (!file || !mime) return new Response("Not found", { status: 404 });
  const body = await readFile(file);
  return cached(request, etag, () => fileResponse(body, mime));
}

function stylesheetResponse(brand: Brand): Response {
  return new Response(brand.stylesheet, {
    headers: { "Content-Type": "text/css; charset=utf-8" },
  });
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": CACHE_CONTROL },
  });
}

function fileResponse(body: Buffer, mime: string): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": mime,
      // An SVG opened on its own must not run script on the Hub's origin.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cached(
  request: Request,
  etag: string,
  respond: () => Response,
): Response {
  const headers = { ETag: etag, "Cache-Control": CACHE_CONTROL };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  const response = respond();
  for (const [key, value] of Object.entries(headers))
    response.headers.set(key, value);
  return response;
}
