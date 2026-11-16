/**
 * The brand pack shape, v1. This zod schema is canonical: `brand.schema.json` is
 * generated from it (`pnpm brand:schema`), and the API keeps a copy of that file.
 *
 * No `@/` imports here: `scripts/brand-pack.mjs` bundles this file with esbuild.
 */
import { z } from "zod";
import { parseCssColor } from "./color";

export const BRAND_PACK_VERSION = 1;

/** A file inside the pack folder: relative, no `..`, no scheme. */
const PACK_FILE_PATTERN = "^(?!/)(?!.*\\.\\.)(?!.*:)[A-Za-z0-9._/-]+$";
const URL_PATTERN = "^(https?:|mailto:)";
/** Same shape check as the API side; a full RFC 5322 parse is not the goal. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PackFile = z.string().regex(new RegExp(PACK_FILE_PATTERN), {
  message:
    "Use a file inside the pack folder: a relative path with no '..' and no scheme",
});

const ThemedFile = z.strictObject({
  light: PackFile,
  dark: PackFile.optional(),
});

const ColorToken = z.strictObject({
  $type: z.literal("color"),
  $value: z
    .string()
    .min(4)
    .refine((value) => parseCssColor(value) !== null, {
      message: "Use a hex, rgb(), hsl() or oklch() colour",
    }),
});

const Url = z.string().regex(new RegExp(URL_PATTERN)).refine(isAbsoluteUrl, {
  message: "Use an absolute https:, http: or mailto: URL",
});

const Email = z.string().refine((value) => EMAIL_SHAPE.test(value), {
  message: "Use an email address",
});

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
    .optional(),
  poweredBy: z.boolean().optional(),
  personas: z
    .strictObject({
      assistant: z.string().min(1).optional(),
      bot: z.string().min(1).optional(),
    })
    .optional(),
  email: z
    .strictObject({
      senderName: z.string().min(1).optional(),
      fromAddress: Email.optional(),
      supportAddress: Email.optional(),
    })
    .optional(),
});

export type BrandPack = z.infer<typeof BrandPackSchema>;

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
  if (zodSchema === Email) node.format = "email";
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
    title:
      "Endatix brand pack v1 (spec artifact; H1's zod schema must generate an equal document)",
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
