"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { Copy, Info, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createTenantAction } from "../create-tenant.action";
import {
  identityStepError,
  roleHasHubAccess,
  TENANT_DEFAULT_REGISTRATION_ROLES,
  tenantPublicSignInPath,
  type AuthProviderOption,
} from "../tenant-self-registration";

type CreateStep = 1 | 2 | 3 | "done";

const STEP_COPY: Record<Exclude<CreateStep, "done">, { title: string; description: string }> = {
  1: {
    title: "Identity",
    description: "Name the tenant. The public sign-in URL is generated after create.",
  },
  2: {
    title: "Access",
    description: "Configure whether people can self-register through the tenant URL.",
  },
  3: {
    title: "Confirm",
    description: "Review the tenant before creating it. The public id cannot be changed later.",
  },
};

interface CreateTenantDialogProps {
  authProviders: AuthProviderOption[];
}

export function CreateTenantDialog({
  authProviders,
}: Readonly<CreateTenantDialogProps>) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState(
    TENANT_DEFAULT_REGISTRATION_ROLES[0].name,
  );
  const [createdSignInPath, setCreatedSignInPath] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setName("");
    setDescription("");
    setAllowSelfRegistration(false);
    setAllowedProviders([]);
    setDefaultRole(TENANT_DEFAULT_REGISTRATION_ROLES[0].name);
    setCreatedSignInPath(null);
    setStepError(null);
  }, [open]);

  const goToAccess = () => {
    const error = identityStepError(name);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    setStep(2);
  };

  const copySignInUrl = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    toast.success("Sign-in URL copied");
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createTenantAction({
        name: name.trim(),
        description: description.trim() || null,
        allowSelfRegistration,
        allowedAuthProviderKeys: allowedProviders,
        defaultRegistrationRoleName: defaultRole,
      });

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to create tenant");
        return;
      }

      const path = tenantPublicSignInPath(result.value.slug);
      setCreatedSignInPath(path);
      setStep("done");
      toast.success("Tenant created");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Create tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create tenant</DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Copy the public sign-in URL. Anyone with the link can open it."
              : `Step ${step} of 3 — ${STEP_COPY[step].title}. ${STEP_COPY[step].description}`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Name</Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-description">Description</Label>
              <Textarea
                id="tenant-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-1">
                <Label htmlFor="tenant-self-reg">Allow self-registration</Label>
                <p className="text-sm text-muted-foreground">
                  People can create an account from the tenant sign-in URL.
                </p>
              </div>
              <Switch
                id="tenant-self-reg"
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
              <Label htmlFor="tenant-default-role">Default registration role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole}>
                <SelectTrigger id="tenant-default-role" className="w-full">
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
                  {defaultRole} can sign in to Hub. Use Respondent unless you
                  intend new accounts to manage forms.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 3 && (
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{name.trim()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Self-registration</dt>
              <dd>{allowSelfRegistration ? "On" : "Off"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Default role</dt>
              <dd>{defaultRole}</dd>
            </div>
          </dl>
        )}

        {step === "done" && createdSignInPath && (
          <div className="grid gap-2">
            <Label htmlFor="tenant-signin-url">Public sign-in URL</Label>
            <div className="flex gap-2">
              <Input id="tenant-signin-url" value={createdSignInPath} readOnly />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copySignInUrl(createdSignInPath)}
              >
                <Copy />
                <span className="sr-only">Copy sign-in URL</span>
              </Button>
            </div>
          </div>
        )}

        {stepError && (
          <p className="text-sm text-destructive">{stepError}</p>
        )}

        <DialogFooter>
          {step !== "done" && step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStepError(null);
                setStep((current) => (current === 1 ? 1 : ((Number(current) - 1) as 1 | 2 | 3)));
              }}
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button type="button" onClick={goToAccess}>
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button type="button" onClick={() => setStep(3)}>
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? "Creating…" : "Create tenant"}
            </Button>
          )}
          {step === "done" && (
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
