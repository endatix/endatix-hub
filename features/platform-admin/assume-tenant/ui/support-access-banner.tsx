import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { exitAssumeAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";

interface SupportAccessBannerProps {
  tenantName?: string;
}

export function SupportAccessBanner({ tenantName }: Readonly<SupportAccessBannerProps>) {
  const title = tenantName
    ? `Support access — ${tenantName}`
    : "Support access";

  return (
    <Alert variant="info" className="rounded-none border-x-0" data-slot="support-access-banner">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        You are viewing this tenant as a platform administrator. You are not a
        member of the tenant.
      </AlertDescription>
      <AlertAction>
        <form action={exitAssumeAction}>
          <Button type="submit" variant="outline" size="sm">
            Exit tenant
          </Button>
        </form>
      </AlertAction>
    </Alert>
  );
}
