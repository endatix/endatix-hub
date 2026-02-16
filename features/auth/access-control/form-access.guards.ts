import { FormAccessService } from "./form-access.service";
import { AuthCheckResult, AuthorizationResult } from "../authorization/domain/authorization-result";
import { handlePermissionError } from "../authorization/application/error-handler";

export function requireViewFormFactory(
  getFormAccess: (formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>,
) {
  return async (formId: string, submissionId?: string, token?: string): Promise<void> => {
    const access = await getFormAccess(formId, submissionId, token);
    const result: AuthCheckResult = access.canViewForm()
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden("You do not have permission to view this form");
    
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireDesignFormFactory(
  getFormAccess: (formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>,
) {
  return async (formId: string, submissionId?: string, token?: string): Promise<void> => {
    const access = await getFormAccess(formId, submissionId, token);
    const result: AuthCheckResult = access.canDesignForm()
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden("You do not have permission to design this form");
    
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireCreateSubmissionFactory(
  getFormAccess: (formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>,
) {
  return async (formId: string, submissionId?: string, token?: string): Promise<void> => {
    const access = await getFormAccess(formId, submissionId, token);
    const result: AuthCheckResult = access.canCreateSubmission()
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden("You do not have permission to create submissions");
    
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireEditSubmissionFactory(
  getFormAccess: (formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>,
) {
  return async (formId: string, submissionId: string, token?: string): Promise<void> => {
    const access = await getFormAccess(formId, submissionId, token);
    const result: AuthCheckResult = access.canEditSubmission()
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden("You do not have permission to edit this submission");
    
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireViewSubmissionFactory(
  getFormAccess: (formId: string, submissionId?: string, token?: string) => Promise<FormAccessService>,
) {
  return async (formId: string, submissionId: string, token?: string): Promise<void> => {
    const access = await getFormAccess(formId, submissionId, token);
    const result: AuthCheckResult = access.canViewSubmission()
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden("You do not have permission to view this submission");
    
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}
