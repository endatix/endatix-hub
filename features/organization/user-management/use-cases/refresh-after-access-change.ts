import "server-only";

import { revalidatePath } from "next/cache";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization";

/**
 * After a change to a user's access: cached permissions and the users list.
 * Clears every user's entry: the cache is keyed on the session's user id, which for
 * external sign-in (Keycloak) is the provider's id, not the Endatix id these actions get.
 */
export function refreshAfterUserAccessChange() {
  invalidateUserAuthorizationCache({ allUsers: true });
  revalidatePath("/settings/organization/users");
}
