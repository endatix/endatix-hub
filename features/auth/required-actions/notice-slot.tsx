import type { Session } from "next-auth";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import { resolverPath } from "@/lib/routes/resolve-target";
import { getAuthDataForCurrentUser } from "../authorization/application/authorization-data.provider";
import { NoticeBanner } from "./notice-banner";

export async function NoticeSlot({
  session,
}: Readonly<{ session: Session | null }>) {
  const result = await getAuthDataForCurrentUser(session)();
  if (!result.success) return null;
  const actions = requiredActionsSchema.safeParse(result.data.requiredActions);
  if (!actions.success) return null;
  return actions.data
    .filter((a) => a.severity === "notice")
    .map((action) => (
      <NoticeBanner
        key={`${result.data.userId}:${result.data.tenantId}:${action.key}`}
        href={resolverPath(action)}
      />
    ));
}
