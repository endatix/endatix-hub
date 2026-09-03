"use client";

import { PanelSection } from "@/components/common/panel-section";
import { StatusBadge } from "@/components/common/status-badge";
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
import { ShieldAlert, UserPlus } from "lucide-react";
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
}

export function TenantAccessFields({
  idPrefix,
  allowSelfRegistration,
  onAllowSelfRegistrationChange,
  defaultRole,
  onDefaultRoleChange,
}: Readonly<TenantAccessFieldsProps>) {
  const selfRegId = `${idPrefix}-self-reg`;
  const roleId = `${idPrefix}-default-role`;
  const roleHintId = `${idPrefix}-default-role-hint`;

  return (
    <PanelSection
      icon={UserPlus}
      title="Self-registration"
      description="Whether people can create their own account from the tenant sign-in URL."
      aside={
        <StatusBadge
          tone={allowSelfRegistration ? "on" : "off"}
          label={allowSelfRegistration ? "On" : "Off"}
        />
      }
    >
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={selfRegId}>Allow self-registration</Label>
        <Switch
          id={selfRegId}
          checked={allowSelfRegistration}
          onCheckedChange={onAllowSelfRegistrationChange}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={roleId}>Default registration role</Label>
        <Select
          value={defaultRole}
          onValueChange={onDefaultRoleChange}
          disabled={!allowSelfRegistration}
        >
          <SelectTrigger
            id={roleId}
            className="w-full"
            aria-describedby={allowSelfRegistration ? undefined : roleHintId}
          >
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
        {/* Inert while the toggle is off: disabled and explained beats a
            control that silently does nothing. */}
        {!allowSelfRegistration && (
          <p id={roleHintId} className="text-xs text-muted-foreground">
            Applies once self-registration is on.
          </p>
        )}
      </div>

      {allowSelfRegistration && roleHasHubAccess(defaultRole) && (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertTitle>{defaultRole} can sign in to Hub</AlertTitle>
          <AlertDescription>
            Anyone who registers through this URL will be able to manage forms.
            Use Respondent unless that is intended.
          </AlertDescription>
        </Alert>
      )}
    </PanelSection>
  );
}
