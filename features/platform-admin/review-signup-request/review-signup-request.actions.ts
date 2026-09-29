"use server";

import { EndatixApi } from "@/lib/endatix-api";
import { saasManagementFlag } from "@/lib/feature-flags/flags";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";
import { listSignupRequests } from "../list-signup-requests/list-signup-requests.server";
import { requirePlatformAdmin } from "../server";
import { loadSignupVisitor } from "./load-signup-visitor.server";
import { toSignupRequestView } from "./signup-request-view.server";
import type {
  SignupRequestView,
  SignupVisitorLookup,
  SignupVisitorRef,
} from "./types";

const LOGGER = "platform-admin.signup-requests";

async function guardSignupManagement(): Promise<ResultType<SignupRequestView> | null> {
  if (!(await saasManagementFlag())) {
    return Result.error<SignupRequestView>(
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
): Promise<ResultType<SignupRequestView>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  const trimmedName = tenantName.trim();
  if (!id) {
    return Result.validationError<SignupRequestView>(
      "Signup request is required.",
    );
  }
  if (!trimmedName) {
    return Result.validationError<SignupRequestView>(
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
      mapData: toSignupRequestView,
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
): Promise<ResultType<SignupRequestView>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  const trimmedComment = comment.trim();
  if (!id) {
    return Result.validationError<SignupRequestView>(
      "Signup request is required.",
    );
  }
  if (!trimmedComment) {
    return Result.validationError<SignupRequestView>(
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
      mapData: toSignupRequestView,
    },
  );
  if (Result.isSuccess(result)) {
    revalidateSignupInbox();
  }

  return result;
}

export async function retrySignupProvisioningAction(
  signupRequestId: string,
): Promise<ResultType<SignupRequestView>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  if (!id) {
    return Result.validationError<SignupRequestView>(
      "Signup request is required.",
    );
  }

  const session = await requirePlatformAdmin();
  const api = new EndatixApi(session.accessToken);
  const result = toResult(await api.signupRequests.retryProvisioning(id), {
    fallbackMessage: "Failed to retry provisioning.",
    logMessage: "Failed to retry signup provisioning.",
    loggerName: LOGGER,
    mapData: toSignupRequestView,
  });
  if (Result.isSuccess(result)) {
    revalidateSignupInbox();
  }

  return result;
}

/**
 * Re-read one signup after a decision. The pending queue no longer contains an
 * approved row, so refreshing that list cannot update the open panel.
 */
export async function refreshSignupRequestAction(
  signupRequestId: string,
  email: string,
): Promise<ResultType<SignupRequestView>> {
  const guard = await guardSignupManagement();
  if (guard) {
    return guard;
  }

  const id = signupRequestId.trim();
  const trimmedEmail = email.trim();
  if (!id || !trimmedEmail) {
    return Result.error<SignupRequestView>("Signup request is required.");
  }

  const session = await requirePlatformAdmin();
  const page = await listSignupRequests(session, {
    status: "all",
    search: trimmedEmail,
    pageSize: 20,
  });
  if (Result.isError(page)) {
    return page;
  }

  revalidateSignupInbox();
  const match = page.value.items.find((item) => item.id === id);
  return match
    ? Result.success(match)
    : Result.error<SignupRequestView>("This request is no longer available.");
}

/**
 * What PostHog recorded about the visitor behind a signup, for the review panel.
 * Best effort: failures come back as `unavailable`, never as an error.
 */
export async function getSignupVisitorAction(
  ref: SignupVisitorRef,
): Promise<SignupVisitorLookup> {
  const cleaned: SignupVisitorRef = {
    distinctId: ref.distinctId?.trim() || null,
    sessionId: ref.sessionId?.trim() || null,
  };
  if (
    (!cleaned.distinctId && !cleaned.sessionId) ||
    (await guardSignupManagement())
  ) {
    return { status: "unavailable", profileHref: null };
  }

  await requirePlatformAdmin();
  return loadSignupVisitor(cleaned);
}
