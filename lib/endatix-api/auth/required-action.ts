import { z } from "zod";

export const requiredActionsSchema = z.array(
  z.object({
    key: z.string().min(1),
    resolvePath: z.string(),
    scope: z.enum(["user", "tenant"]),
    severity: z.enum(["blocking", "notice"]),
    resolverRoles: z.array(z.string()),
    blockNonResolvers: z.boolean(),
    blockingFrom: z.string().nullish(),
    canResolve: z.boolean(),
  }),
);

export type RequiredAction = z.infer<typeof requiredActionsSchema>[number];

export type RequiredActionError = {
  kind: "required_action";
  actions: RequiredAction[];
};
