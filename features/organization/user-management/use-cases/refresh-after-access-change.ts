import "server-only";

import { revalidatePath } from "next/cache";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization";

/** After a change to a user's access: their cached permissions and the users list. */
export function refreshAfterUserAccessChange(userId: string) {
  invalidateUserAuthorizationCache({ userId });
  revalidatePath("/settings/organization/users");
}
