import { auth } from "@/auth";
import { requiredActionsSchema } from "@/lib/endatix-api/auth/required-action";
import { resolverPath } from "@/lib/routes/resolve-target";
import { getAuthDataForCurrentUser } from "../authorization/application/authorization-data.provider";
import { NoticeBanner } from "./notice-banner";

export async function NoticeSlot() {
  const result = await getAuthDataForCurrentUser(await auth())();
  if (!result.success) return null;
  const actions = requiredActionsSchema.safeParse(result.data.requiredActions);
  if (!actions.success) return null;
  return actions.data
    .filter((a) => a.severity === "notice")
    .map((action) => (
      <NoticeBanner key={action.key} href={resolverPath(action)} />
    ));
}
