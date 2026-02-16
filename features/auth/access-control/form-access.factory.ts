import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getFormAccessDataForContext } from "./form-access-data.provider";
import { FormAccessService } from "./form-access.service";

export interface FormAccessContext {
  formId: string;
  submissionId?: string;
  token?: string;
  session?: Session | null;
}

export async function createFormAccessService(
  context: FormAccessContext
): Promise<FormAccessService> {
  const { formId, submissionId, token } = context;

  const session = context.session === undefined ? await auth() : context.session;

  const fetchAccessData = getFormAccessDataForContext(session);

  const policyData = await fetchAccessData(formId, submissionId, token);

  return new FormAccessService(policyData);
}

export async function getFormAccess(
  formId: string,
  submissionId?: string,
  token?: string,
): Promise<FormAccessService> {
  return createFormAccessService({ formId, submissionId, token });
}
