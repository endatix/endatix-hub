import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { PlatformAdminPageHeader } from "./platform-admin-page-header";

interface PlatformAdminShellProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PlatformAdminShell({
  title,
  description,
  actions,
  children,
}: Readonly<PlatformAdminShellProps>) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PlatformAdminPageHeader title={title} description={description} />
        {actions}
      </div>
      <Separator />
      {children}
    </div>
  );
}
