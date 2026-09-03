"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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
  type AuthProviderOption,
} from "../tenant-registration";

interface TenantAccessFieldsProps {
  idPrefix: string;
  allowSelfRegistration: boolean;
  onAllowSelfRegistrationChange: (value: boolean) => void;
  authProviders: AuthProviderOption[];
  allowedProviders: string[];
  onAllowedProvidersChange: (value: string[]) => void;
  defaultRole: string;
  onDefaultRoleChange: (value: string) => void;
  showSelfRegHint?: boolean;
}

export function TenantAccessFields({
  idPrefix,
  allowSelfRegistration,
  onAllowSelfRegistrationChange,
  authProviders,
  allowedProviders,
  onAllowedProvidersChange,
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
      {authProviders.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">
            Allowed auth providers
          </legend>
          {authProviders.map((provider) => {
            const providerId = `${idPrefix}-provider-${provider.id}`;

            return (
              <div key={provider.id} className="flex items-center gap-2">
                <Checkbox
                  id={providerId}
                  checked={allowedProviders.includes(provider.id)}
                  onCheckedChange={(checked) => {
                    onAllowedProvidersChange(
                      checked === true
                        ? [...allowedProviders, provider.id]
                        : allowedProviders.filter((id) => id !== provider.id),
                    );
                  }}
                />
                <Label htmlFor={providerId} className="font-normal">
                  {provider.name}
                </Label>
              </div>
            );
          })}
        </fieldset>
      )}
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
