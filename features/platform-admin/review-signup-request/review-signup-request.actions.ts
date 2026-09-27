"use server";

import { EndatixApi } from "@/lib/endatix-api";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "../server";

const LOGGER = "platform-admin.signup-requests";

async function guardSignupManagement(): Promise<ResultType<SignupRequestListItem> | null> {
  if (!(await saasManagementFlag())) {
    return Result.error<SignupRequestListItem>(
      "Signup is not enabled for this environment.",
    );
  }

  return null;
}

function revalidateSignupInbox(): void {
  revalidatePath("/admin/signup-requests");
  revalidatePath("/admin");
}

export async function approveSignupRequestAction(
  signupRequestId: string,
  tenantName: string,
): Promise<ResultType<SignupRequestListItem>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  const trimmedName = tenantName.trim();
  if (!id) {
    return Result.validationError<SignupRequestListItem>(
      "Signup request is required.",
    );
  }
  if (!trimmedName) {
    return Result.validationError<SignupRequestListItem>(
      "Tenant name is required.",
    );
  }

  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const result = toResult(
    await api.signupRequests.approve(id, { tenantName: trimmedName }),
    {
      fallbackMessage: "Failed to approve signup request.",
      preferredFields: ["tenantName"],
      logMessage: "Failed to approve signup request.",
      loggerName: LOGGER,
    },
  );
  if (Result.isSuccess(result)) {
    revalidateSignupInbox();
  }

  return result;
}

export async function rejectSignupRequestAction(
  signupRequestId: string,
  comment: string,
): Promise<ResultType<SignupRequestListItem>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  const trimmedComment = comment.trim();
  if (!id) {
    return Result.validationError<SignupRequestListItem>(
      "Signup request is required.",
    );
  }
  if (!trimmedComment) {
    return Result.validationError<SignupRequestListItem>(
      "Rejection comment is required.",
    );
  }

  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const result = toResult(
    await api.signupRequests.reject(id, { comment: trimmedComment }),
    {
      fallbackMessage: "Failed to reject signup request.",
      preferredFields: ["comment"],
      logMessage: "Failed to reject signup request.",
      loggerName: LOGGER,
    },
  );
  if (Result.isSuccess(result)) {
    revalidateSignupInbox();
  }

  return result;
}

export async function retrySignupProvisioningAction(
  signupRequestId: string,
): Promise<ResultType<SignupRequestListItem>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  if (!id) {
    return Result.validationError<SignupRequestListItem>(
      "Signup request is required.",
    );
  }

  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const result = toResult(await api.signupRequests.retryProvisioning(id), {
    fallbackMessage: "Failed to retry provisioning.",
    logMessage: "Failed to retry signup provisioning.",
    loggerName: LOGGER,
  });
  if (Result.isSuccess(result)) {
    revalidateSignupInbox();
  }

  return result;
}
