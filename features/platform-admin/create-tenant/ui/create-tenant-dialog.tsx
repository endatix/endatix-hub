"use client";

import { PanelSection } from "@/components/common/panel-section";
import { PanelSteps } from "@/components/common/panel-steps";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryRow } from "@/components/common/summary-row";
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
import { CircleCheckBig, ClipboardCheck, Info, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import {
  TENANT_REGISTRATION_ROLES,
  tenantNameError,
} from "../../tenant-registration";
import { createTenantAction } from "../create-tenant.action";

type CreateStep = 1 | 2 | 3 | "done";

const STEP_LABELS = ["Identity", "Access", "Confirm"] as const;

const STEP_DESCRIPTION: Record<Exclude<CreateStep, "done">, string> = {
  1: "Name the tenant. A unique public id is generated when it is created.",
  2: "Decide whether people can create their own account from the tenant URL.",
  3: "Check the details before creating the tenant.",
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
            ? "The tenant is live. Share the sign-in URL with its first users."
            : STEP_DESCRIPTION[step]}
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>

      <ResponsivePanelBody className="grid content-start gap-5">
        {step !== "done" && <PanelSteps steps={STEP_LABELS} current={step} />}

        {step === 1 && (
          <>
            <TenantIdentityFields
              idPrefix="tenant"
              name={name}
              onNameChange={(value) => {
                setName(value);
                setStepError(null);
              }}
              description={description}
              onDescriptionChange={setDescription}
              error={stepError}
            />
            <Alert variant="info">
              <Info />
              <AlertTitle>The public id is permanent</AlertTitle>
              <AlertDescription>
                A unique short URL is generated during creation. Sign-in links
                use it, and it cannot be changed afterwards.
              </AlertDescription>
            </Alert>
          </>
        )}

        {step === 2 && (
          <TenantAccessFields
            idPrefix="tenant"
            allowSelfRegistration={allowSelfRegistration}
            onAllowSelfRegistrationChange={setAllowSelfRegistration}
            defaultRole={defaultRole}
            onDefaultRoleChange={setDefaultRole}
          />
        )}

        {step === 3 && (
          <>
            <PanelSection
              icon={ClipboardCheck}
              title="Review"
              description="This is what will be created."
            >
              <dl className="grid gap-3">
                <SummaryRow label="Name" value={name.trim()} />
                <SummaryRow
                  label="Description"
                  value={
                    description.trim() || (
                      <span className="text-muted-foreground">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Not set</span>
                      </span>
                    )
                  }
                />
                <SummaryRow
                  label="Self-registration"
                  value={
                    <StatusBadge
                      tone={allowSelfRegistration ? "on" : "off"}
                      label={allowSelfRegistration ? "On" : "Off"}
                    />
                  }
                />
                {allowSelfRegistration && (
                  <SummaryRow label="Default role" value={defaultRole} />
                )}
              </dl>
            </PanelSection>
            <Alert variant="info">
              <Info />
              <AlertTitle>The public id is assigned now</AlertTitle>
              <AlertDescription>
                You can rename the tenant later, but its sign-in URL is fixed
                once it exists.
              </AlertDescription>
            </Alert>
          </>
        )}

        {step === "done" && createdShortUrl && (
          <>
            <Alert variant="success">
              <CircleCheckBig />
              <AlertTitle>{name.trim()} is ready</AlertTitle>
              <AlertDescription>
                {allowSelfRegistration
                  ? `Anyone with the link can register as ${defaultRole}.`
                  : "Self-registration is off, so accounts must be invited."}
              </AlertDescription>
            </Alert>
            <TenantSignInUrlField
              id="tenant-signin-url"
              shortUrl={createdShortUrl}
            />
          </>
        )}
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
