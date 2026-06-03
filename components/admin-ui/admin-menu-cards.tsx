"use client";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

type AdminMenuCardsProps = {
  showStorage?: boolean;
};

export function AdminMenuCards({ showStorage }: Readonly<AdminMenuCardsProps>) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {showStorage && (
        <Card
          className="@container/card cursor-pointer"
          onClick={() => router.push("/admin/storage")}
        >
          <CardHeader>
            <CardDescription>Database Usage</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              Storage
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              View database storage statistics and form distribution.
            </div>
            <div className="text-muted-foreground"></div>
          </CardFooter>
        </Card>
      )}
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
          <CardDescription>Manage Tenants</CardDescription>
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
      <Card
        className="@container/card cursor-pointer"
        onClick={() => router.push("/admin/environment")}
      >
        <CardHeader>
          <CardDescription>Review Environment Details</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Environment
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Debug environment variables e.g. NODE_ENV, etc.
          </div>
          <div className="text-muted-foreground"></div>
        </CardFooter>
      </Card>
      <Card
        className="@container/card cursor-pointer"
        onClick={() => router.push("/admin/email")}
      >
        <CardHeader>
          <CardDescription>Manage Email Settings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            Email
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            View email provider and send test emails.
          </div>
          <div className="text-muted-foreground"></div>
        </CardFooter>
      </Card>
    </div>
  );
}
