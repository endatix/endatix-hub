import { Construction } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicStatusPage } from "@/components/public-status/public-status-page";
import {
  getMaintenanceData,
  isMaintenanceMode,
} from "@/lib/maintenance/maintenance-config";

export function generateMetadata(): Metadata {
  if (!isMaintenanceMode()) {
    return {
      title: "404 - Page Not Found",
      description: "The page you are looking for does not exist.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const data = getMaintenanceData();
  return {
    title: data.metadataTitle,
    description: data.metadataDescription,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Proxy rewrites Hub, embed and view/edit routes here, so the reader may be an
 * operator or a customer's respondent — it is a public status page (DESIGN.md §6).
 */
export default function MaintenancePage() {
  if (!isMaintenanceMode()) {
    notFound();
  }

  const data = getMaintenanceData();

  return (
    <PublicStatusPage
      icon={Construction}
      layout="page"
      message={[data.cardDescription, data.body]}
      note={data.footer}
      title={data.title}
      tone="neutral"
    />
  );
}
