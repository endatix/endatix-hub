"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import {
  roleHasHubAccess,
  TENANT_REGISTRATION_ROLES,
} from "../tenant-registration";

interface TenantAccessFieldsProps {
  idPrefix: string;
  allowSelfRegistration: boolean;
  onAllowSelfRegistrationChange: (value: boolean) => void;
  defaultRole: string;
  onDefaultRoleChange: (value: string) => void;
  showSelfRegHint?: boolean;
}

export function TenantAccessFields({
  idPrefix,
  allowSelfRegistration,
  onAllowSelfRegistrationChange,
  defaultRole,
  onDefaultRoleChange,
  showSelfRegHint = false,
}: Readonly<TenantAccessFieldsProps>) {
  const selfRegId = `${idPrefix}-self-reg`;
  const roleId = `${idPrefix}-default-role`;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor={selfRegId}>Allow self-registration</Label>
          {showSelfRegHint && (
            <p className="text-sm text-muted-foreground">
              People can create an account from the tenant sign-in URL.
            </p>
          )}
        </div>
        <Switch
          id={selfRegId}
          checked={allowSelfRegistration}
          onCheckedChange={onAllowSelfRegistrationChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={roleId}>Default registration role</Label>
        <Select value={defaultRole} onValueChange={onDefaultRoleChange}>
          <SelectTrigger id={roleId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TENANT_REGISTRATION_ROLES.map((role) => (
              <SelectItem key={role.name} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {roleHasHubAccess(defaultRole) && (
        <Alert variant="info">
          <Info />
          <AlertTitle>Hub access</AlertTitle>
          <AlertDescription>
            {defaultRole} can sign in to Hub. Use Respondent unless you intend
            new accounts to manage forms.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
