import { Construction } from "lucide-react";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getMaintenanceData,
  isMaintenanceMode,
} from "@/lib/maintenance/maintenance-config";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  if (!isMaintenanceMode()) {
    return {
      title: "404 - Page Not Found",
      description: "The page you are looking for does not exist.",
      generator: "Endatix",
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

export default function MaintenancePage() {
  if (!isMaintenanceMode()) {
    notFound();
  }

  const data = getMaintenanceData();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-xl border-primary/20 shadow-lg">
        <CardHeader className="flex flex-col items-center gap-4 pb-4 text-center">
          <Badge variant="secondary">{data.badgeLabel}</Badge>
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Construction className="size-10" aria-hidden />
          </div>
          <CardTitle className="text-3xl tracking-tight md:text-4xl">
            {data.title}
          </CardTitle>
          <CardDescription className="max-w-prose text-base">
            {data.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 text-center">
          <p className="max-w-prose text-muted-foreground">{data.body}</p>

          <Separator />

          <p className="max-w-prose text-sm text-muted-foreground">
            {data.footer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
