"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useTransition } from "react";
import { Spinner } from "@/components/loaders/spinner";

export function KeycloakSignInButton() {
  const [isPending, startTransition] = useTransition();

  const handleKeycloakSignIn = () => {
    startTransition(async () => {
      await signIn("keycloak", { callbackUrl: "/forms" });
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleKeycloakSignIn}
      disabled={isPending}
    >
      {isPending && <Spinner className="mr-2 h-4 w-4" />}
      Sign in with Keycloak
    </Button>
  );
}
