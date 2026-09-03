import Link from "next/link";
import type { Route } from "next";
import {
  Building2,
  HardDrive,
  KeyRound,
  Mail,
  Server,
  UserCog,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PlatformDashboardCounts } from "../view-platform-dashboard.server";

interface PlatformDashboardProps {
  dashboard: PlatformDashboardCounts;
}

export function PlatformDashboard({
  dashboard,
}: Readonly<PlatformDashboardProps>) {
  return (
    <div className="space-y-10">
      <DashboardSection
        title="Platform Management"
        description="Manage platform-wide tenants and administrator access."
      >
        <DashboardCard
          title="Tenants"
          value={dashboard.tenants}
          description="Organizations currently known to the platform."
          href="/admin/tenants"
          icon={Building2}
        />
        <DashboardCard
          title="Platform Admins"
          value={dashboard.admins}
          description="Users with local PlatformAdmin approval."
          href="/admin/platform-admins"
          icon={UserCog}
        />
      </DashboardSection>

      <DashboardSection
        title="Configuration"
        description="Review safe platform configuration status without exposing secrets."
      >
        <DashboardCard
          title="Environment"
          description="Review Hub runtime API origin and SurveyJS extensions status."
          href="/admin/environment"
          icon={Server}
        />
        <DashboardCard
          title="Storage"
          description="Review allowlisted storage provider status and file configuration."
          href="/admin/storage"
          icon={HardDrive}
        />
        <DashboardCard
          title="Email"
          description="Review email provider status, templates, and test sending."
          href="/admin/email"
          icon={Mail}
        />
        <DashboardCard
          title="Auth"
          description="Review authentication provider status and PlatformAdmin approval rules."
          href="/admin/auth"
          icon={KeyRound}
        />
      </DashboardSection>
    </div>
  );
}

interface DashboardSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function DashboardSection({
  title,
  description,
  children,
}: Readonly<DashboardSectionProps>) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4">
        {children}
      </div>
    </section>
  );
}

interface DashboardCardProps {
  title: string;
  value?: string | number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function DashboardCard({
  title,
  value,
  description,
  href,
  icon: Icon,
}: Readonly<DashboardCardProps>) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md border bg-muted/40 p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4">
        {value !== undefined && (
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
        )}
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={href as Route}>Open {title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
