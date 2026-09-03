"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuthProviderOption } from "@/features/platform-admin/tenant-registration";
import { EditTenantSheet } from "@/features/platform-admin/update-tenant/ui/edit-tenant-sheet";
import type { PagedResponse, PlatformTenantListItem } from "@/lib/endatix-api";
import { getFormattedDate } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

/** Tenant, Public id, ID, Self-reg, Forms, Submissions, Created, Modified. */
const BASE_COLUMNS = 8;

interface TenantsTableProps {
  tenants: PagedResponse<PlatformTenantListItem>;
  canManage?: boolean;
  authProviders?: AuthProviderOption[];
}

export function TenantsTable({
  tenants,
  canManage = false,
  authProviders = [],
}: Readonly<TenantsTableProps>) {
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const columnCount = BASE_COLUMNS + (canManage ? 1 : 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Public id</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Self-reg</TableHead>
                <TableHead>Forms</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Modified</TableHead>
                {canManage && (
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
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
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {tenant.shortUrl}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.selfRegistrationEnabled ? "default" : "secondary"
                      }
                    >
                      {tenant.selfRegistrationEnabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tenant.formsCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tenant.submissionsCount}</Badge>
                  </TableCell>
                  <TableCell>{getFormattedDate(tenant.createdAt)}</TableCell>
                  <TableCell>{getFormattedDate(tenant.modifiedAt)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                            <span className="sr-only">Open tenant actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingTenantId(tenant.id)}
                          >
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {tenants.items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
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
      {canManage && (
        <EditTenantSheet
          tenantId={editingTenantId}
          authProviders={authProviders}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingTenantId(null);
            }
          }}
        />
      )}
    </>
  );
}
