import { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { SettingsSidebarNav } from "@/components/layout-ui/my-account/settings-sidebar-nav";
import PageTitle from "@/components/headings/page-title";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your user account and profile settings.",
};

const sidebarNavItems = [
  {
    title: "Security",
    href: "/settings/security",
  },
  {
    title: "Users",
    href: "/settings/organization/users",
  },
  {
    title: "Organization settings",
    href: "/settings/organization/forms",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="min-w-0 space-y-6 md:block">
      <div className="space-y-0.5 mb-12">
        <PageTitle title="Settings" />
        <p className="text-muted-foreground">
          Manage your user account and profile settings.
        </p>
        <Separator className="my-4" />
      </div>
      <section className="overflow-hidden rounded-md border border-border/25 bg-card shadow-sm">
        <div className="flex flex-col gap-8 overflow-x-hidden p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-12">
          <SettingsSidebarNav items={sidebarNavItems} />
          <div className="min-w-0 flex-1 overflow-x-auto">{children}</div>
        </div>
      </section>
    </div>
  );
}
