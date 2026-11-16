import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Brand } from "./index";
import { resolveDeploymentBrand } from "./effective-brand.server";
import { locatePackFile, type LoadedBrandPack } from "./read-pack";

const CACHE_CONTROL = "public, max-age=300";

/** Fixed names for code that cannot await the brand (`global-error.tsx` is a client root). */
const ALIASES: Readonly<Record<string, (brand: Brand) => string>> = {
  icon: (brand) => brand.icon,
  "logo-light": (brand) => brand.logo.light,
  "logo-dark": (brand) => brand.logo.dark,
};

const NOT_FOUND = () => new Response("Not found", { status: 404 });

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

  if (name === "brand.css") return stylesheetRoute(brand, request);
  const alias = ALIASES[name];
  if (alias) return redirectTo(alias(brand));

  const mime = pack?.files.get(name);
  if (!pack || !mime) return NOT_FOUND();
  return cached(request, `"${pack.fingerprint}"`, () =>
    packFileResponse(pack, name, mime),
  );
}

/** Tagged by content, so a Hub upgrade that derives other values gets a new tag. */
function stylesheetRoute(brand: Brand, request: Request): Promise<Response> {
  const hash = createHash("sha256").update(brand.stylesheet).digest("hex");
  const respond = async () =>
    new Response(brand.stylesheet, {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  return cached(request, `"${hash.slice(0, 12)}"`, respond);
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": CACHE_CONTROL },
  });
}

/** Resolved again per request: the file may have moved since the pack was read. */
async function packFileResponse(
  pack: LoadedBrandPack,
  name: string,
  mime: string,
): Promise<Response> {
  const body = await readPackFile(pack, name);
  if (!body) return NOT_FOUND();
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": mime, ...FILE_HEADERS },
  });
}

async function readPackFile(pack: LoadedBrandPack, name: string) {
  const file = locatePackFile(pack.dir, name);
  if (typeof file !== "string") return null;
  return readFile(file).catch(() => null);
}

const FILE_HEADERS = {
  // An SVG opened on its own must not run script on the Hub's origin.
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "X-Content-Type-Options": "nosniff",
};

async function cached(
  request: Request,
  etag: string,
  respond: () => Promise<Response>,
): Promise<Response> {
  const headers = { ETag: etag, "Cache-Control": CACHE_CONTROL };
  if (matchesEtag(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers });
  }
  const response = await respond();
  if (response.ok) {
    for (const [key, value] of Object.entries(headers))
      response.headers.set(key, value);
  }
  return response;
}

/** RFC 9110 weak comparison: a list of tags, `W/` ignored, `*` matches. */
function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  return header
    .split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .some((tag) => tag === "*" || tag === etag);
}
