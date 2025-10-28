import { auth } from "@/auth";
import { SIGNIN_PATH } from "@/features/auth";
import { createPermissionService } from "@/features/auth/permissions/application";
import SessionCard from "@/features/auth/ui/session-card";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";
import { Session } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  const { requireHubAccess } = await createPermissionService(session);
  await requireHubAccess();

  const enableExperimental = await experimentalFeaturesFlag();
  const allowHomePage =
    enableExperimental || process.env.NODE_ENV !== "production";
  if (!allowHomePage) {
    redirect(SIGNIN_PATH);
  }

  const userInfo = await getCurrentUserInfo(session);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Home</h1>
      </div>

      <div className="flex flex-col gap-4">
        {session?.user?.email && <SessionCard session={session} />}
      </div>
      {userInfo && (
        <div className="space-y-2">
          <h3 className="text-md font-semibold">User Info Claims (Debug)</h3>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto">
            {JSON.stringify(userInfo.claims, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// TODO: delete this code as it's for debugging purposes
interface UserInfoResponse {
  claims: Record<string, string>;
}

async function getCurrentUserInfo(session: Session | null) {
  const headers = new Headers();
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  headers.set("Accept", "application/json");

  try {
    const userInfoResponse = await fetch(
      `${process.env.ENDATIX_API_URL}/my-account/user-info`,
      { headers },
    );
    if (!userInfoResponse.ok) {
      throw new Error(
        `Failed to fetch user info: ${userInfoResponse.statusText}`,
      );
    }
    const userInfoData = await userInfoResponse.json();
    return userInfoData as UserInfoResponse;
  } catch (error) {
    console.error("Unexpected error fetching user info:", error);
    return null;
  }
}
