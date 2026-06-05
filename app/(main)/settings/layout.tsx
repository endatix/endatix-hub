import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your user account and profile settings.",
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <div className="min-w-0">{children}</div>;
}
