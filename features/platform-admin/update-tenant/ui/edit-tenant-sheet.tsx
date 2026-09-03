"use client";

import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { toast } from "@/components/ui/toast";
import { TenantAccessFields } from "@/features/platform-admin/ui/tenant-access-fields";
import { TenantIdentityFields } from "@/features/platform-admin/ui/tenant-identity-fields";
import { TenantSignInUrlField } from "@/features/platform-admin/ui/tenant-signin-url-field";
import { Result } from "@/lib/result";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  TENANT_REGISTRATION_ROLES,
  tenantNameError,
  type AuthProviderOption,
} from "../../tenant-registration";
import { getTenantAction, updateTenantAction } from "../update-tenant.action";

interface EditTenantSheetProps {
  tenantId: string | null;
  authProviders: AuthProviderOption[];
  onOpenChange: (open: boolean) => void;
}

export function EditTenantSheet({
  tenantId,
  authProviders,
  onOpenChange,
}: Readonly<EditTenantSheetProps>) {
  const open = tenantId !== null;
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState(
    TENANT_REGISTRATION_ROLES[0].name,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!tenantId) {
      setShortUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setNameError(null);
    setLoadError(null);
    getTenantAction(tenantId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (Result.isError(result)) {
          setLoadError(result.message || "Failed to load tenant");
          return;
        }

        setShortUrl(result.value.shortUrl);
        setName(result.value.name);
        setDescription(result.value.description ?? "");
        setAllowSelfRegistration(result.value.allowSelfRegistration);
        setAllowedProviders([...result.value.allowedAuthProviderKeys]);
        setDefaultRole(result.value.defaultRegistrationRoleName);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const submit = () => {
    if (!tenantId) {
      return;
    }

    const error = tenantNameError(name);
    setNameError(error);
    if (error) {
      return;
    }

    startTransition(async () => {
      const result = await updateTenantAction(tenantId, {
        name: name.trim(),
        description: description.trim(),
        allowSelfRegistration,
        allowedAuthProviderKeys: allowedProviders,
        defaultRegistrationRoleName: defaultRole,
      });

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to update tenant");
        return;
      }

      toast.success("Tenant updated");
      onOpenChange(false);
    });
  };

  return (
    <ResponsivePanel
      desktopType="complex"
      open={open}
      onOpenChange={onOpenChange}
    >
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Edit tenant</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Update the display name and self-registration policy. The public id
          stays locked because sign-in URLs already use it.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>

      {isLoading || !shortUrl ? (
        <ResponsivePanelBody>
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : (
              <Loader2 className="size-5 animate-spin" />
            )}
          </div>
        </ResponsivePanelBody>
      ) : (
        <ResponsivePanelBody className="grid gap-4">
          <TenantIdentityFields
            idPrefix="edit-tenant"
            name={name}
            onNameChange={(value) => {
              setName(value);
              setNameError(null);
            }}
            description={description}
            onDescriptionChange={setDescription}
          />
          <TenantSignInUrlField
            id="edit-tenant-signin-url"
            shortUrl={shortUrl}
          />
          <TenantAccessFields
            idPrefix="edit-tenant"
            allowSelfRegistration={allowSelfRegistration}
            onAllowSelfRegistrationChange={setAllowSelfRegistration}
            authProviders={authProviders}
            allowedProviders={allowedProviders}
            onAllowedProvidersChange={setAllowedProviders}
            defaultRole={defaultRole}
            onDefaultRoleChange={setDefaultRole}
          />
          {nameError && <p className="text-sm text-destructive">{nameError}</p>}
        </ResponsivePanelBody>
      )}

      <ResponsivePanelFooter>
        <Button
          type="button"
          onClick={submit}
          disabled={isPending || isLoading || !shortUrl}
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </ResponsivePanelFooter>
    </ResponsivePanel>
  );
}
