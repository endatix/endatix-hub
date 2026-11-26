import { z } from "zod";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";

export const documentKind = z.enum(["terms", "privacy"]);
export type DocumentKind = z.infer<typeof documentKind>;
export const titles = { terms: "Terms", privacy: "Privacy notice" };
const change = z.enum(["material", "minor"]);
export type Change = z.infer<typeof change>;

const displayed = z.object({
  kind: documentKind,
  revision: z.union([
    z.literal("0"),
    z.string().max(19).regex(/^\d+$/).pipe(createEndatixIdSchema("revision")),
  ]),
});
export const documentState = displayed.extend({
  required: z.boolean(),
  publishedNumber: z.number().int().nonnegative(),
  draftMarkdown: z.string().nullable(),
});
export type DocumentState = z.infer<typeof documentState>;
export const editSchema = z.discriminatedUnion("operation", [
  displayed.extend({
    operation: z.literal("draft"),
    markdown: z.string().min(1),
  }),
  displayed.extend({ operation: z.literal("required"), required: z.boolean() }),
  displayed.extend({
    operation: z.literal("publish"),
    change,
  }),
]);
export type Edit = z.infer<typeof editSchema>;

export const publication = z.object({
  id: createEndatixIdSchema("id"),
  number: z.number().int().positive(),
  change,
  // Match the API's string.IsNullOrWhiteSpace without trimming published Markdown.
  markdown: z.string().refine((text) => /\P{White_Space}/u.test(text) && !text.includes("\0")),
  publishedByUserId: createEndatixIdSchema("publishedByUserId"),
  publishedAt: z.iso.datetime({ offset: true, local: true }),
});
export type Publication = z.infer<typeof publication>;
