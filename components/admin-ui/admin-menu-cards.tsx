"use client";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function AdminMenuCards() {
  const router = useRouter();
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card
        className="@container/card cursor-pointer"
        onClick={() => router.push("/admin/agents")}
      >
        <CardHeader>
          <CardDescription>Manage Agents</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Agents
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Recent agent stats here, e.g. + 1000 conversations, + 1000 messages,
            + 1000 users, etc.
          </div>
          <div className="text-muted-foreground"></div>
        </CardFooter>
      </Card>
      <Card
        className="@container/card cursor-pointer"
        onClick={() => router.push("/admin/tenants")}
      >
        <CardHeader>
          <CardDescription>ManageTenants</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Tenants
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Number of tenants here, e.g. 1000 tenants
          </div>
          <div className="text-muted-foreground"></div>
        </CardFooter>
      </Card>
    </div>
  );
}
