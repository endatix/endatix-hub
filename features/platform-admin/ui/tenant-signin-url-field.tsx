"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Copy } from "lucide-react";
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
      // Clipboard writes reject when permission is denied or the page is not a secure context.
      toast.error("Could not copy the sign-in URL");
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Public sign-in URL</Label>
      <div className="flex gap-2">
        <Input id={id} value={path} readOnly />
        <Button type="button" variant="outline" size="icon" onClick={copy}>
          <Copy />
          <span className="sr-only">Copy sign-in URL</span>
        </Button>
      </div>
    </div>
  );
}
