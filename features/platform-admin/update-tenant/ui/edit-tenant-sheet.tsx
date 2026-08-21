"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PlatformTenant } from "@/lib/endatix-api/platform-tenants/types";
import { Result } from "@/lib/result";
import { Copy, Info, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  roleHasHubAccess,
  TENANT_DEFAULT_REGISTRATION_ROLES,
  type AuthProviderOption,
} from "../../create-tenant/tenant-self-registration";
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
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState(
    TENANT_DEFAULT_REGISTRATION_ROLES[0].name,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    getTenantAction(tenantId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (Result.isError(result)) {
          toast.error(result.message || "Failed to load tenant");
          onOpenChange(false);
          return;
        }

        setTenant(result.value);
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
  }, [tenantId, onOpenChange]);

  const copySlug = async () => {
    if (!tenant?.slug) {
      return;
    }

    await navigator.clipboard.writeText(tenant.slug);
    toast.success("Slug copied");
  };

  const submit = () => {
    if (!tenantId) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit tenant</SheetTitle>
          <SheetDescription>
            Update the display name and self-registration policy. The slug stays
            locked because public URLs already use it.
          </SheetDescription>
        </SheetHeader>

        {isLoading || !tenant ? (
          <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-tenant-name">Name</Label>
              <Input
                id="edit-tenant-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tenant-description">Description</Label>
              <Textarea
                id="edit-tenant-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tenant-slug">Slug</Label>
              <div className="flex gap-2">
                <Input id="edit-tenant-slug" value={tenant.slug} readOnly />
                <Button type="button" variant="outline" size="icon" onClick={copySlug}>
                  <Copy />
                  <span className="sr-only">Copy slug</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="edit-tenant-self-reg">Allow self-registration</Label>
              <Switch
                id="edit-tenant-self-reg"
                checked={allowSelfRegistration}
                onCheckedChange={setAllowSelfRegistration}
              />
            </div>
            {authProviders.length > 0 && (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Allowed auth providers</legend>
                {authProviders.map((provider) => (
                  <label
                    key={provider.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={allowedProviders.includes(provider.id)}
                      onCheckedChange={(checked) => {
                        setAllowedProviders((current) =>
                          checked === true
                            ? [...current, provider.id]
                            : current.filter((id) => id !== provider.id),
                        );
                      }}
                    />
                    {provider.name}
                  </label>
                ))}
              </fieldset>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-tenant-default-role">Default registration role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger id="edit-tenant-default-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_DEFAULT_REGISTRATION_ROLES.map((role) => (
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
                  {defaultRole} can sign in to Hub.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <SheetFooter>
          <Button type="button" onClick={submit} disabled={isPending || isLoading}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
