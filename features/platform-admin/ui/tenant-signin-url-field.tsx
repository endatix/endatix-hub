"use client";

import { PanelSection } from "@/components/common/panel-section";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Copy, Link2 } from "lucide-react";
import { tenantPublicSignInPath } from "../tenant-registration";

interface TenantSignInUrlFieldProps {
  id: string;
  shortUrl: string;
}

export function TenantSignInUrlField({
  id,
  shortUrl,
}: Readonly<TenantSignInUrlFieldProps>) {
  const path = tenantPublicSignInPath(shortUrl);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Sign-in URL copied");
    } catch {
      toast.error("Could not copy the sign-in URL");
    }
  };

  return (
    <PanelSection
      icon={Link2}
      title="Public sign-in URL"
      description="Share this link with people who should sign in to this tenant."
      aside={<StatusBadge tone="off" label="Locked" />}
    >
      <div className="grid gap-2">
        <Label htmlFor={id} className="sr-only">
          Public sign-in URL
        </Label>
        <div className="flex gap-2">
          <Input id={id} value={path} readOnly className="font-mono text-sm" />
          <Button type="button" variant="outline" size="icon" onClick={copy}>
            <Copy />
            <span className="sr-only">Copy sign-in URL</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Generated on creation and permanent — existing links would break if it
          changed.
        </p>
      </div>
    </PanelSection>
  );
}
