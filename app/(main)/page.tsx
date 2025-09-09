import { auth } from "@/auth";
import SessionCard from '@/features/auth/ui/session-card';
import { Session } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  if (process.env.NODE_ENV === "production") {
    redirect("/forms");
  }
  const session = await auth();
  const userInfo = await getCurrentUserInfo(session);

  return (
    <div className="flex flex-col gap-4">
      Home
      <div className="flex flex-col gap-4">
        {session?.user?.email && <SessionCard session={session} />}
      </div>
      <pre>{JSON.stringify(userInfo?.claims, null, 2)}</pre>
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
  const userInfo = await fetch(
    `${process.env.ENDATIX_BASE_URL}/api/my-account/user-info`,
    { headers },
  );
  const userInfoData = await userInfo.json();

  return userInfoData as UserInfoResponse;
}
