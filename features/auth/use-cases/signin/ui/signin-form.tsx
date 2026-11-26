import { FC } from "react";
import { AuthPresentation } from "@/features/auth/infrastructure/types";
import EndatixSignInForm from "./endatix-sign-in-form";
import ExternalSignInOptions from "./external-sign-in-button";
import { workspaceStartHref } from "@/lib/routes/workspace-path";

interface SigninFormProps {
  endatixAuthProvider: AuthPresentation;
  externalAuthProviders?: AuthPresentation[];
  returnUrl?: string;
}

const SigninForm: FC<SigninFormProps> = ({
  endatixAuthProvider,
  externalAuthProviders,
  returnUrl = workspaceStartHref,
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
