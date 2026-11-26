"use client";

import {
  type ComponentProps,
  useRef,
  useState,
  useTransition,
} from "react";
import { Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import type { RoleListItem } from "@/lib/endatix-api";
import {
  createTenantUserAction,
  type CreateTenantUserActionState,
} from "../create-tenant-user.action";
import {
  getStringFormValue,
  getStringFormValues,
} from "@/lib/utils/form-data-utils";

interface CreateTenantUserDialogProps {
  roles: RoleListItem[];
}

const initialState: CreateTenantUserActionState = { isSuccess: undefined };

export function CreateTenantUserDialog({
  roles,
}: Readonly<CreateTenantUserDialogProps>) {
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [state, setState] = useState<CreateTenantUserActionState>(initialState);
  const [pending, startTransition] = useTransition();
  const draftVersion = useRef(0);
  const { trackEvent } = useTrackEvent();

  const toggleSelectedRole = (roleName: string, checked: boolean) => {
    if (isTenantAdminRole(roleName)) {
      return;
    }

    setSelectedRoles((current) =>
      checked
        ? [...new Set([...current, roleName])]
        : current.filter((role) => role !== roleName),
    );
  };

  const resetInviteDraft = () => {
    draftVersion.current++;
    setSelectedRoles([]);
    setState(initialState);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetInviteDraft();
    }
  };

  const finishInvite = (result: CreateTenantUserActionState, displayed: number) => {
    if (result.isSuccess) {
      toast.success("Invite sent");
      trackEvent("organization_user_invited", { success: true });
      if (displayed === draftVersion.current) handleOpenChange(false);
    } else if (displayed === draftVersion.current) {
      reportInviteFailure(result);
      setState(result);
    }
  };

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: getStringFormValue(formData, "email"),
      roles: getStringFormValues(formData, "roles"),
    };

    const displayed = draftVersion.current;
    startTransition(async () => {
      const result = await createTenantUserAction(initialState, payload);
      finishInvite(result, displayed);
    });
  };

  return (
    <ResponsivePanel
      desktopType="complex"
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button>
          <Plus data-icon="inline-start" />
          Invite User
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <ResponsivePanelHeader>
          <ResponsivePanelTitle>Invite User</ResponsivePanelTitle>
          <ResponsivePanelDescription>
            Send a one-time invite link. The user verifies their email and
            chooses their own password during activation.
          </ResponsivePanelDescription>
        </ResponsivePanelHeader>

        <ResponsivePanelBody>
          <InviteFeedback state={state} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              defaultValue={state.data?.email}
            />
            {state.errors?.email?.[0] && (
              <p className="text-sm text-destructive">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>Roles</Label>
            {roles.some((role) => isTenantAdminRole(role.name)) && (
              <Alert className="bg-muted/40">
                <AlertDescription>
                  Admin access can be assigned after the invited user verifies
                  their account.
                </AlertDescription>
              </Alert>
            )}
            {roles.length > 0 ? (
              roles.map((role) => {
                const isSelected = selectedRoles.includes(role.name);
                const isAdminRole = isTenantAdminRole(role.name);

                let roleClassName: string;
                if (isAdminRole) {
                  roleClassName =
                    "flex cursor-not-allowed gap-4 rounded-lg border bg-muted/40 p-4 opacity-70";
                } else if (isSelected) {
                  roleClassName =
                    "flex cursor-pointer gap-4 rounded-lg border border-primary bg-primary/5 p-4";
                } else {
                  roleClassName =
                    "flex cursor-pointer gap-4 rounded-lg border bg-background p-4 hover:bg-muted/40";
                }

                return (
                  <label key={role.id} className={roleClassName}>
                    <Checkbox
                      checked={isSelected}
                      disabled={isAdminRole}
                      onCheckedChange={(checked) =>
                        toggleSelectedRole(role.name, checked === true)
                      }
                      className="mt-1"
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium break-words">
                        {role.name}
                      </span>
                      <span className="text-sm break-words text-muted-foreground">
                        {isAdminRole
                          ? "Available after the invited user verifies their account."
                          : role.description || "No description provided."}
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No tenant-editable roles are available. You can invite the user
                and assign roles later.
              </p>
            )}
            {selectedRoles.map((role) => (
              <input key={role} type="hidden" name="roles" value={role} />
            ))}
            <p className="text-sm text-muted-foreground">
              Leave roles empty to invite the user without tenant permissions.
            </p>
          </div>
        </ResponsivePanelBody>

        <ResponsivePanelFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetInviteDraft();
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending..." : "Send Invite"}
          </Button>
        </ResponsivePanelFooter>
      </form>
    </ResponsivePanel>
  );
}

function isTenantAdminRole(roleName: string) {
  return roleName.toLowerCase() === SystemRoles.Admin.toLowerCase();
}

function InviteFeedback({ state }: Readonly<{ state: CreateTenantUserActionState }>) {
  if (!state.feedback) return null;
  if (state.feedback.kind === "standing") return <StandingRefusal refusal={state.feedback.refusal} />;
  return (
    <Alert role="alert">
      <AlertDescription>
        {state.feedback.kind === "declined"
          ? "This workspace can’t invite teammates yet. You can keep working and try again later."
          : "Invitations are temporarily unavailable. Try sending the invite again."}
      </AlertDescription>
    </Alert>
  );
}

function reportInviteFailure(state: CreateTenantUserActionState) {
  if (state.isSuccess === false && !state.feedback && state.formErrors?.length && !state.errors?.email?.length) {
    toast.error(state.formErrors[0]);
  }
}
