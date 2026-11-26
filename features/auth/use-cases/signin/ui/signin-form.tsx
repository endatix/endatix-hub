"use client";

import { FC, useSyncExternalStore } from "react";
import type { AuthPresentation } from "@/features/auth/infrastructure/types";
import EndatixSignInForm from "./endatix-sign-in-form";
import ExternalSignInOptions from "./external-sign-in-button";
import { workspaceStartHref } from "@/lib/routes/workspace-path";
import { signinDestination } from "../signin-destination";

interface SigninFormProps {
  endatixAuthProvider: AuthPresentation;
  externalAuthProviders?: AuthPresentation[];
  returnUrl?: string;
  callbackUrl?: string;
  publicOrigin?: string;
}

// The page origin is stable for this document. SSR cannot verify it from forwarding headers.
const subscribe = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => undefined;

const SigninForm: FC<SigninFormProps> = (props) => {
  const origin = useSyncExternalStore(subscribe, browserOrigin, serverOrigin);
  const destination = signinDestination(props, props.publicOrigin ?? origin) ?? workspaceStartHref;
  return (
    <>
      <EndatixSignInForm
        endatixAuthProvider={props.endatixAuthProvider}
        returnUrl={destination}
      />
      <ExternalSignInOptions
        externalAuthProviders={props.externalAuthProviders}
        returnUrl={destination}
      />
    </>
  );
};

export default SigninForm;
