import { Badge } from "@/components/ui/badge";

interface ExternalUserBadgeProps {
  authProvider: string;
}

export function ExternalUserBadge({
  authProvider,
}: Readonly<ExternalUserBadgeProps>) {
  return (
    <Badge
      variant="outline"
      className="border-info-border bg-info-background text-info-foreground"
    >
      External: {authProvider}
    </Badge>
  );
}
