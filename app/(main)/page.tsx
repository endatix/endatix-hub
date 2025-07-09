import { auth } from "@/auth";
import SessionCard from '@/features/auth/use-cases/keycloak/ui/session-card';

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-4">
      Home
      <div className="flex flex-col gap-4">
        {session?.user?.email && <SessionCard session={session} />}
      </div>
    </div>
  );
}
