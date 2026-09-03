"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  TENANT_REGISTRATION_ROLES,
  tenantNameError,
} from "../../tenant-registration";
import { getTenantAction, updateTenantAction } from "../update-tenant.action";

interface EditTenantSheetProps {
  tenantId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function EditTenantSheet({
  tenantId,
  onOpenChange,
}: Readonly<EditTenantSheetProps>) {
  const open = tenantId !== null;
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
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
        setDefaultRole(result.value.defaultRegistrationRoleName);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Failed to load tenant");
        }
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
          Update the name, description, or self-registration policy.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>

      {isLoading || !shortUrl ? (
        <ResponsivePanelBody>
          {loadError ? (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Could not load this tenant</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <output>
                <Loader2 className="size-5 motion-safe:animate-spin" />
                <span className="sr-only">Loading tenant</span>
              </output>
            </div>
          )}
        </ResponsivePanelBody>
      ) : (
        <ResponsivePanelBody className="grid content-start gap-5">
          <TenantIdentityFields
            idPrefix="edit-tenant"
            name={name}
            onNameChange={(value) => {
              setName(value);
              setNameError(null);
            }}
            description={description}
            onDescriptionChange={setDescription}
            error={nameError}
          />
          <TenantSignInUrlField
            id="edit-tenant-signin-url"
            shortUrl={shortUrl}
          />
          <TenantAccessFields
            idPrefix="edit-tenant"
            allowSelfRegistration={allowSelfRegistration}
            onAllowSelfRegistrationChange={setAllowSelfRegistration}
            defaultRole={defaultRole}
            onDefaultRoleChange={setDefaultRole}
          />
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
