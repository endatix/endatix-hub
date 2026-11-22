/**
 * The brand pack shape, v1. This zod schema is canonical: `brand.schema.json` is
 * generated from it (`pnpm brand:schema`), and the API keeps a copy of that file.
 *
 * No `@/` imports here: `scripts/brand-pack.mjs` bundles this file with esbuild.
 */
import { z } from "zod";
import { parseCssColor } from "./color";

export const BRAND_PACK_VERSION = 1;

/**
 * A file inside the pack folder: `/`-separated names, none empty or starting
 * with `.` (so no `.`, `..` or hidden files), no `..` anywhere, no scheme.
 */
const PACK_FILE_PATTERN = String.raw`^(?!.*\.\.)[A-Za-z0-9_-][A-Za-z0-9._-]*(?:/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$`;
const URL_PATTERN = "^(https?:|mailto:)";
/**
 * One dot-separated part of an address: no whitespace, no ASCII control
 * character, no U+FFFE (which .NET cannot normalise), no dot, and none of the
 * characters .NET's `MailAddress` reads as a comment, display name, quote or
 * list (one regex test, no backtracking). Tab through carriage return sit in
 * `\s`, so the control ranges leave that gap.
 */
const ADDRESS_ATOM = /^[^\x00-\x08\x0E-\x1F\x7F\s\uFFFE.@()<>[\]\\",;:]+$/;

/**
 * `local@domain`, each side dot-separated atoms with no empty one: the bare
 * addresses `MailAddress` reads back unchanged, which the API requires. It
 * normalises to NFC, so an address that is not NFC reads back changed. Quoted
 * local parts, which it also accepts, are left out.
 */
function isBareAddress(value: string): boolean {
  const at = value.indexOf("@");
  if (at < 0 || value.normalize("NFC") !== value) return false;
  return [value.slice(0, at), value.slice(at + 1)].every((side) =>
    side.split(".").every((atom) => ADDRESS_ATOM.test(atom)),
  );
}

const PackFile = z.string().regex(new RegExp(PACK_FILE_PATTERN), {
  message:
    "Use a file inside the pack folder: a relative path of plain names, with no '.', '..' or empty segments and no scheme",
});

const ThemedFile = z.strictObject({
  light: PackFile,
  dark: PackFile.optional(),
});

/**
 * The limit the API's `BrandOverrideReader.COLOR_MAX_LENGTH` applies to tenant
 * brand overrides, counted before trimming. zod counts code points and the API
 * UTF-16 units; the colour grammar is ASCII, so both agree at the cap.
 */
const COLOR_MAX_LENGTH = 64;
const COLOR_MESSAGE = `Use a hex, rgb(), hsl() or oklch() colour of at most ${COLOR_MAX_LENGTH} characters`;

const ColorToken = z.strictObject({
  $type: z.literal("color"),
  $value: z
    .string()
    .min(4)
    .max(COLOR_MAX_LENGTH, { message: COLOR_MESSAGE, abort: true })
    .refine((value) => parseCssColor(value) !== null, {
      message: COLOR_MESSAGE,
    }),
});

const Url = z.string().regex(new RegExp(URL_PATTERN)).refine(isAbsoluteUrl, {
  message: "Use an absolute https:, http: or mailto: URL",
});

const MAILTO = "mailto:";
const MAILTO_ADDRESS_END = /[?#]/;

/**
 * The API reads the support address from a `mailto:` link: the part before `?`
 * or `#` (RFC 6068), percent-decoded, and a list of addresses leaves its
 * built-in address. So the link must name one address, or a list.
 */
function namesSupportAddress(link: string): boolean {
  if (!link.startsWith(MAILTO)) return true;
  const address = decodeOrKeep(
    link.slice(MAILTO.length).split(MAILTO_ADDRESS_END)[0],
  );
  return address.includes(",") || isBareAddress(address);
}

/**
 * Percent-decodes as .NET's `Uri.UnescapeDataString` does: an ASCII escape is
 * always decoded, a valid UTF-8 sequence of escapes is decoded as one
 * character, and every other escape stays as written.
 */
function decodeOrKeep(value: string): string {
  return value.replaceAll(/(?:%[0-9A-Fa-f]{2})+/g, decodeEscapeRun);
}

function decodeEscapeRun(run: string): string {
  const escapes = run.match(/%[0-9A-Fa-f]{2}/g) ?? [];
  let decoded = "";
  for (let index = 0; index < escapes.length; ) {
    const length = utf8SequenceLength(
      Number.parseInt(escapes[index].slice(1), 16),
    );
    const sequence = escapes.slice(index, index + length).join("");
    const character =
      index + length <= escapes.length ? decodeOrNull(sequence) : null;
    decoded += character ?? escapes[index];
    index += character === null ? 1 : length;
  }
  return decoded;
}

/** The bytes a UTF-8 sequence starting with this byte takes. */
function utf8SequenceLength(lead: number): number {
  if (lead >= 0xf0) return 4;
  if (lead >= 0xe0) return 3;
  if (lead >= 0xc0) return 2;
  return 1;
}

function decodeOrNull(sequence: string): string | null {
  try {
    return decodeURIComponent(sequence);
  } catch {
    return null;
  }
}

export const BrandPackSchema = z.strictObject({
  $schema: z.string().optional(),
  version: z.literal(BRAND_PACK_VERSION),
  name: z.string().min(1).max(60),
  legalName: z.string().max(120).optional(),
  assets: z
    .strictObject({
      logo: ThemedFile.optional(),
      icon: PackFile.optional(),
      ogImage: PackFile.optional(),
    })
    .optional(),
  tokens: z
    .strictObject({
      color: z
        .strictObject({
          primary: ColorToken,
          "primary-on-dark": ColorToken.optional(),
        })
        .optional(),
    })
    .optional(),
  links: z
    .strictObject({
      website: Url.optional(),
      docs: Url.optional(),
      support: Url.optional(),
      privacy: Url.optional(),
      terms: Url.optional(),
    })
    .superRefine((links, context) => {
      if (links.support !== undefined && !namesSupportAddress(links.support))
        context.addIssue({
          code: "custom",
          path: ["support"],
          message: "Use a mailto: link to one email address",
        });
    })
    .optional(),
  poweredBy: z.boolean().optional(),
  personas: z
    .strictObject({
      assistant: z.string().min(1).optional(),
      bot: z.string().min(1).optional(),
    })
    .optional(),
});

export type BrandPack = z.infer<typeof BrandPackSchema>;

/**
 * Checks a parsed `brand.json`. A top-level `email` section, from packs written
 * before the sender moved to the API's email settings, is ignored, as the API
 * ignores it; every other unknown key still fails.
 */
export function parseBrandPack(
  input: unknown,
): z.ZodSafeParseResult<BrandPack> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return BrandPackSchema.safeParse(input);
  const { email: _ignored, ...pack } = input as Record<string, unknown>;
  return BrandPackSchema.safeParse(pack);
}

/** One line per issue, `path: message`, so an operator finds the field. */
export function formatBrandPackIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const keys =
        issue.code === "unrecognized_keys" ? ` (${issue.keys.join(", ")})` : "";
      const where = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${where}: ${issue.message}${keys}`;
    })
    .join("\n");
}

/** Named `$defs` in the generated document, as the spec names them. */
function definitions() {
  const registry = z.registry<{ id: string }>();
  registry.add(PackFile, { id: "packFile" });
  registry.add(ThemedFile, { id: "themedFile" });
  registry.add(ColorToken, { id: "colorToken" });
  registry.add(Url, { id: "url" });
  return registry;
}

/** Writes each node the way the spec does. Refinements stay runtime-only. */
function asSpecWritesIt({
  zodSchema,
  jsonSchema,
}: {
  zodSchema: unknown;
  jsonSchema: object;
}) {
  const node = jsonSchema as Record<string, unknown>;
  // A `const` already fixes the type; the spec writes it bare.
  if ("const" in node) delete node.type;
  // RegExp#source escapes `/`; the spec keeps the pattern as written.
  if (zodSchema === PackFile) node.pattern = PACK_FILE_PATTERN;
  if (zodSchema === Url) node.format = "uri";
}

/** The JSON Schema document for `brand.schema.json`. */
export function brandPackJsonSchema(): Record<string, unknown> {
  const { $schema, ...rest } = z.toJSONSchema(BrandPackSchema, {
    target: "draft-2020-12",
    metadata: definitions(),
    override: asSpecWritesIt,
  }) as Record<string, unknown>;
  return {
    $schema,
    $id: "https://docs.endatix.com/schemas/brand/1/brand.schema.json",
    title: "Endatix brand pack v1",
    ...rest,
  };
}

function isAbsoluteUrl(value: string): boolean {
  try {
    return new URL(value).protocol.length > 0;
  } catch {
    return false;
  }
}
