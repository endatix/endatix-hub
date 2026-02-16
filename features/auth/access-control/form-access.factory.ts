import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getFormAccessDataForContext } from "./form-access-data.provider";
import { FormAccessService } from "./form-access.service";

export async function createFormAccessService(
  session: Session | null = null,
): Promise<(formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>> {
  session = session ?? (await auth());
  const getFormAccessData = getFormAccessDataForContext(session);

  return async (formId: string, submissionId?: string, token?: string) => {
    const data = await getFormAccessData(formId, submissionId, token);
    return new FormAccessService(data);
  };
}

export async function getFormAccess(
  formId: string,
  submissionId?: string,
  token?: string,
): Promise<FormAccessService> {
  const session = await auth();
  if (!session?.accessToken) {
    return new FormAccessService({ formPermissions: [], submissionPermissions: [] });
  }

  const getFormAccessData = getFormAccessDataForContext(session);
  const data = await getFormAccessData(formId, submissionId, token);
  return new FormAccessService(data);
}
