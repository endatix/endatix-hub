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
import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import {
  TENANT_REGISTRATION_ROLES,
  tenantNameError,
} from "../../tenant-registration";
import { createTenantAction } from "../create-tenant.action";

type CreateStep = 1 | 2 | 3 | "done";

const STEP_COPY: Record<
  Exclude<CreateStep, "done">,
  { title: string; description: string }
> = {
  1: {
    title: "Identity",
    description:
      "Name the tenant. The public sign-in URL is generated after create.",
  },
  2: {
    title: "Access",
    description:
      "Configure whether people can self-register through the tenant URL.",
  },
  3: {
    title: "Confirm",
    description:
      "Review the tenant before creating it. The public id cannot be changed later.",
  },
};

const DEFAULT_ROLE = TENANT_REGISTRATION_ROLES[0].name;

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [defaultRole, setDefaultRole] = useState(DEFAULT_ROLE);
  const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset here rather than in an effect so a reopened panel never paints the previous run's step.
  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStep(1);
      setName("");
      setDescription("");
      setAllowSelfRegistration(false);
      setDefaultRole(DEFAULT_ROLE);
      setCreatedShortUrl(null);
      setStepError(null);
    }

    setOpen(isOpen);
  };

  const goToAccess = () => {
    const error = tenantNameError(name);
    setStepError(error);
    if (!error) {
      setStep(2);
    }
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createTenantAction({
        name: name.trim(),
        description: description.trim() || null,
        allowSelfRegistration,
        defaultRegistrationRoleName: defaultRole,
      });

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to create tenant");
        return;
      }

      setCreatedShortUrl(result.value.shortUrl);
      setStep("done");
      toast.success("Tenant created");
    });
  };

  return (
    <ResponsivePanel
      desktopType="complex"
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <Button>
          <Plus />
          Create tenant
        </Button>
      }
    >
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Create tenant</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          {step === "done"
            ? "Copy the public sign-in URL. Anyone with the link can open it."
            : `Step ${step} of 3 — ${STEP_COPY[step].title}. ${STEP_COPY[step].description}`}
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>

      <ResponsivePanelBody className="grid gap-4">
        {step === 1 && (
          <TenantIdentityFields
            idPrefix="tenant"
            name={name}
            onNameChange={(value) => {
              setName(value);
              setStepError(null);
            }}
            description={description}
            onDescriptionChange={setDescription}
          />
        )}

        {step === 2 && (
          <TenantAccessFields
            idPrefix="tenant"
            allowSelfRegistration={allowSelfRegistration}
            onAllowSelfRegistrationChange={setAllowSelfRegistration}
            defaultRole={defaultRole}
            onDefaultRoleChange={setDefaultRole}
            showSelfRegHint
          />
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

        {step === "done" && createdShortUrl && (
          <TenantSignInUrlField
            id="tenant-signin-url"
            shortUrl={createdShortUrl}
          />
        )}

        {stepError && <p className="text-sm text-destructive">{stepError}</p>}
      </ResponsivePanelBody>

      <ResponsivePanelFooter>
        {step !== "done" && step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step === 3 ? 2 : 1)}
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
      </ResponsivePanelFooter>
    </ResponsivePanel>
  );
}
