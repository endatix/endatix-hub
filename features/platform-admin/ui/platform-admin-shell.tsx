import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { PlatformAdminPageHeader } from "./platform-admin-page-header";

interface PlatformAdminShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * The platform admin shell component.
 * @param title - The title of the platform admin shell.
 * @param description - The description of the platform admin shell.
 * @param children - The children of the platform admin shell.
 * @returns The platform admin shell component.
 */
export function PlatformAdminShell({
  title,
  description,
  children,
}: Readonly<PlatformAdminShellProps>) {
  return (
    <div className="space-y-8">
      <PlatformAdminPageHeader title={title} description={description} />
      <Separator />
      {children}
    </div>
  );
}
