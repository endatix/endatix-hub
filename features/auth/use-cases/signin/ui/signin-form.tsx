"use server";

import { FC } from "react";
import { AuthPresentation } from "@/features/auth/infrastructure/types";
import EndatixSignInForm from "./endatix-sign-in-form";
import ExternalSignInOptions from "./external-sign-in-button";

interface SigninFormProps {
  endatixAuthProvider: AuthPresentation;
  externalAuthProviders?: AuthPresentation[];
  returnUrl?: string;
}

const DEFAULT_RETURN_URL = "/forms";

const SigninForm: FC<SigninFormProps> = ({
  endatixAuthProvider,
  externalAuthProviders,
  returnUrl: returnUrl = DEFAULT_RETURN_URL,
}) => {
  return (
    <>
      <EndatixSignInForm
        endatixAuthProvider={endatixAuthProvider}
        returnUrl={returnUrl}
      />
      <ExternalSignInOptions
        externalAuthProviders={externalAuthProviders}
        returnUrl={returnUrl}
      />
    </>
  );
};

export default SigninForm;
