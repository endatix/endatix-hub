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
      <div className="flex flex-col overflow-x-hidden pl-4 space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <SettingsSidebarNav items={sidebarNavItems} />
        <div className="flex-1 overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}
