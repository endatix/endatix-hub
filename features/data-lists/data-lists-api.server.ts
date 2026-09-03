import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";

export async function requireDataListsApi(): Promise<EndatixApi> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();
  return new EndatixApi(session?.accessToken);
}
