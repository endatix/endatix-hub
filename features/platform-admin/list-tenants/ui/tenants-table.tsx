import type { PagedResponse, PlatformTenantListItem } from "@/lib/endatix-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormattedDate } from "@/lib/utils";

interface TenantsTableProps {
  tenants: PagedResponse<PlatformTenantListItem>;
}

export function TenantsTable({ tenants }: Readonly<TenantsTableProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Forms</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.items.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="max-w-md whitespace-normal">
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.description || "No description"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tenant.id}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{tenant.formsCount}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{tenant.submissionsCount}</Badge>
                </TableCell>
                <TableCell>{getFormattedDate(tenant.createdAt)}</TableCell>
                <TableCell>{getFormattedDate(tenant.modifiedAt)}</TableCell>
              </TableRow>
            ))}
            {tenants.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No tenants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
