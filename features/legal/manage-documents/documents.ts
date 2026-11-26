import { z } from "zod";

export const documentKind = z.enum(["terms", "privacy"]);
export type DocumentKind = z.infer<typeof documentKind>;
export const titles = { terms: "Terms", privacy: "Privacy notice" };
export type Change = "material" | "minor";

export interface DocumentState {
  kind: DocumentKind;
  revision: string;
  required: boolean;
  publishedNumber: number;
  draftMarkdown: string | null;
}

const displayed = z.object({
  kind: documentKind,
  revision: z.string().regex(/^\d+$/),
});
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
