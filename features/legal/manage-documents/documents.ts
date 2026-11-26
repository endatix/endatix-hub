import { z } from "zod";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";

export const documentKind = z.enum(["terms", "privacy"]);
export type DocumentKind = z.infer<typeof documentKind>;
export const titles = { terms: "Terms", privacy: "Privacy notice" };
export type Change = "material" | "minor";

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
    change: z.enum(["material", "minor"]),
  }),
]);
export type Edit = z.infer<typeof editSchema>;

export interface Publication {
  id: string;
  number: number;
  change: Change;
  markdown: string;
  publishedByUserId: string;
  publishedAt: string;
}
