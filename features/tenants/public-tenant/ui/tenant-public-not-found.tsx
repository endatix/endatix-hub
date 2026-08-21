import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TenantPublicNotFound() {
  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>Tenant not found</CardTitle>
        <CardDescription>
          This sign-in link is not valid. Ask the organization for a current
          link.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
