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
import { normalizeUrlSlug } from "@/lib/url/url-slug";
import { Info, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createTenantAction } from "../create-tenant.action";
import {
  identityStepError,
  roleHasHubAccess,
  suggestedTenantSlug,
  TENANT_DEFAULT_REGISTRATION_ROLES,
  type AuthProviderOption,
} from "../tenant-self-registration";

type CreateStep = 1 | 2 | 3;

const STEP_COPY: Record<CreateStep, { title: string; description: string }> = {
  1: {
    title: "Identity",
    description: "Name the tenant and choose the public slug used in sign-in URLs.",
  },
  2: {
    title: "Access",
    description: "Configure whether people can self-register through the tenant slug.",
  },
  3: {
    title: "Confirm",
    description: "Review the tenant before creating it. The slug cannot be changed later.",
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
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [allowedProviders, setAllowedProviders] = useState<string[]>([]);
  const [defaultRole, setDefaultRole] = useState(
    TENANT_DEFAULT_REGISTRATION_ROLES[0].name,
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setName("");
    setDescription("");
    setSlug("");
    setSlugTouched(false);
    setAllowSelfRegistration(false);
    setAllowedProviders([]);
    setDefaultRole(TENANT_DEFAULT_REGISTRATION_ROLES[0].name);
    setStepError(null);
  }, [open]);

  const nextSlug = suggestedTenantSlug(name, slug, slugTouched);

  const goToAccess = () => {
    const error = identityStepError(name, nextSlug);
    if (error) {
      setStepError(error);
      return;
    }

    setSlug(normalizeUrlSlug(nextSlug));
    setStepError(null);
    setStep(2);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createTenantAction({
        name: name.trim(),
        slug: normalizeUrlSlug(nextSlug),
        description: description.trim() || null,
        allowSelfRegistration,
        allowedAuthProviderKeys: allowedProviders,
        defaultRegistrationRoleName: defaultRole,
      });

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to create tenant");
        return;
      }

      toast.success("Tenant created");
      setOpen(false);
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
            Step {step} of 3 — {STEP_COPY[step].title}. {STEP_COPY[step].description}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Name</Label>
              <Input
                id="tenant-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugTouched) {
                    setSlug(urlSlugPreview(event.target.value));
                  }
                }}
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
            <div className="grid gap-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input
                id="tenant-slug"
                value={nextSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
              />
              <p className="text-sm text-muted-foreground">
                Sign-in URL preview: /t/{normalizeUrlSlug(nextSlug) || "…"}/signin
              </p>
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
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-mono">{normalizeUrlSlug(nextSlug)}</dd>
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

        {stepError && (
          <p className="text-sm text-destructive">{stepError}</p>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStepError(null);
                setStep((current) => (current === 1 ? 1 : ((current - 1) as CreateStep)));
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function urlSlugPreview(name: string): string {
  return suggestedTenantSlug(name, "", false);
}
