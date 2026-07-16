import Link from "next/link";
import type { Route } from "next";
import {
  LineChart,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
  FileDown,
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
import { reportingExportFlag } from "@/lib/feature-flags/flags";

const SETTINGS_GROUPS = [
  {
    title: "Organization",
    description:
      "Tenant-level settings shared by everyone in this organization.",
    items: [
      {
        title: "General",
        description:
          "Manage organization-wide form behavior, including folder assignment policies.",
        href: "/settings/organization/forms",
        icon: Wrench,
      },
      {
        title: "Overview",
        description:
          "Review organization usage across top forms, submissions, and storage.",
        href: "/settings/organization/overview",
        icon: LineChart,
      },
      {
        title: "Users",
        description: "Invite, review, lock, and manage tenant user access.",
        href: "/settings/organization/users",
        icon: Users,
      },
      {
        title: "Roles",
        description:
          "Define organization roles and review permission coverage.",
        href: "/settings/organization/roles",
        icon: UserCog,
      },
      {
        title: "Export formats",
        description:
          "Configure CSV, JSON, and codebook export formats for your organization.",
        href: "/settings/organization/export-formats",
        icon: FileDown,
        requiresReportingExport: true,
      },
    ],
  },
  {
    title: "My Account",
    description: "Personal account settings for the signed-in user.",
    items: [
      {
        title: "Security",
        description: "Update your password and account security preferences.",
        href: "/settings/security",
        icon: ShieldCheck,
      },
    ],
  },
] as const;

type SettingsItem = (typeof SETTINGS_GROUPS)[number]["items"][number];

export default async function SettingsPage() {
  const reportingExportEnabled = await reportingExportFlag();

  const groups = SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (
        "requiresReportingExport" in item &&
        item.requiresReportingExport &&
        !reportingExportEnabled
      ) {
        return false;
      }

      return true;
    }),
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-3xl text-muted-foreground">
          Choose a settings area. These groups match the sidebar sections so the
          child pages stay discoverable when the sidebar is collapsed.
        </p>
      </div>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.title} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {group.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <SettingsCard key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

interface SettingsCardProps {
  item: SettingsItem;
}

function SettingsCard({ item }: Readonly<SettingsCardProps>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md border bg-muted/40 p-2">
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={item.href as Route}>Open {item.title}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
