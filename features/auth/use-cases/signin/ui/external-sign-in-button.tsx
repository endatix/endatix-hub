"use client";

import { Button } from "@/components/ui/button";
import { AuthPresentation } from "@/features/auth/infrastructure";
import { signIn } from "next-auth/react";
import { FC } from "react";

interface ExternalSignInOptionsProps {
  externalAuthProviders?: AuthPresentation[];
  returnUrl: string;
}

const ExternalSignInOptions: FC<ExternalSignInOptionsProps> = ({
  externalAuthProviders = [],
  returnUrl,
}) => {
  if (externalAuthProviders.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      {externalAuthProviders.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          onClick={() => signIn(provider.id, { redirectTo: returnUrl })}
        >
          {provider.signInLabel}
        </Button>
      ))}
    </div>
  );
};

export default ExternalSignInOptions;
