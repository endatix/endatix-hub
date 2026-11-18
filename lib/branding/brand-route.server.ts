import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Brand } from "./index";
import { packFileUrl, resolveDeploymentBrand } from "./effective-brand.server";
import { locatePackFile, type LoadedBrandPack } from "./read-pack";

/** Private: under PostHog targeting the flag, and so the brand, can differ per user. */
const CACHE_CONTROL = "private, max-age=300";

/** Fixed names for code that cannot await the brand (`global-error.tsx` is a client root). */
const ALIASES: ReadonlyMap<string, (brand: Brand) => string> = new Map([
  ["icon", (brand: Brand) => brand.icon],
  ["logo-light", (brand: Brand) => brand.logo.light],
  ["logo-dark", (brand: Brand) => brand.logo.dark],
]);

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
  const alias = ALIASES.get(name);
  if (alias) return redirectTo(alias(brand));

  return pack ? packFileRoute(pack, name, request) : NOT_FOUND();
}

function packFileRoute(
  pack: LoadedBrandPack,
  name: string,
  request: Request,
): Promise<Response> | Response {
  const mime = pack.files.get(name);
  if (!mime) return NOT_FOUND();
  // A page rendered before a pack change asks for the old version: never serve
  // new bytes under the old URL.
  const version = new URL(request.url).searchParams.get("v");
  if (version !== null && version !== pack.fingerprint)
    return redirectTo(packFileUrl(name, pack.fingerprint));
  return cached(request, `"${pack.fingerprint}"`, () =>
    packFileResponse(pack, name, mime),
  );
}

/** Tagged by content, so a Hub upgrade that derives other values gets a new tag. */
function stylesheetRoute(brand: Brand, request: Request): Promise<Response> {
  const hash = createHash("sha256").update(brand.stylesheet).digest("hex");
  const respond = () =>
    Promise.resolve(
      new Response(brand.stylesheet, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      }),
    );
  return cached(request, `"${hash.slice(0, 12)}"`, respond);
}

function redirectTo(location: string): Response {
  return new Response(null, {
    status: 307,
    // The target carries ?v=<fingerprint>; the redirect itself must follow a new pack.
    headers: { Location: location, "Cache-Control": "private, no-cache" },
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
