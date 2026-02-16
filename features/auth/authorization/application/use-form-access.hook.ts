"use client";

import { useCallback, useMemo, useState } from "react";
import { cache } from "react";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { FormAccessData } from "@/lib/endatix-api/auth/types";
import { auth } from "@/auth";
import { Session } from "next-auth";

const FORM_ACCESS_CACHE_TAG = "form_access";

const getFormAccessCacheKey = (formId: string, submissionId?: string) =>
  `${FORM_ACCESS_CACHE_TAG}:${formId}:${submissionId ?? "new"}`;

async function fetchFormAccessData(
  formId: string,
  submissionId: string | undefined,
  accessToken: string,
): Promise<ApiResult<FormAccessData>> {
  const endatixApi = new EndatixApi(accessToken);
  return endatixApi.auth.getFormAccess(formId, submissionId);
}

export interface UseFormAccessOptions {
  formId: string;
  submissionId?: string;
  token?: string;
}

export interface UseFormAccessResult {
  accessData: FormAccessData | null;
  isLoading: boolean;
  error: Error | null;
  canViewForm: boolean;
  canDesignForm: boolean;
  canCreateSubmission: boolean;
  canViewSubmission: boolean;
  canEditSubmission: boolean;
  canUploadFile: boolean;
  canDeleteFile: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get form access permissions.
 * Provides simplified permission checks for client-side UI gating.
 * 
 * @param formId - The form ID
 * @param submissionId - Optional submission ID
 * @param token - Optional access token
 */
export function useFormAccess({
  formId,
  submissionId,
  token,
}: UseFormAccessOptions): UseFormAccessResult {
  const [accessData, setAccessData] = useState<FormAccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await auth();
      if (!session?.accessToken) {
        setAccessData({ formPermissions: [], submissionPermissions: [] });
        return;
      }

      const result = await fetchFormAccessData(
        formId,
        submissionId,
        session.accessToken,
      );

      if (result.success) {
        setAccessData(result.data);
      } else {
        setError(new Error(result.error?.message ?? "Failed to fetch access data"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [formId, submissionId]);

  // Initial fetch
  useMemo(() => {
    fetchData();
  }, [fetchData]);

  const permissions = accessData ?? {
    formPermissions: [],
    submissionPermissions: [],
  };

  return {
    accessData: permissions,
    isLoading,
    error,
    canViewForm: permissions.formPermissions.includes("form.view"),
    canDesignForm: permissions.formPermissions.includes("form.design"),
    canCreateSubmission: permissions.submissionPermissions.includes("submission.create"),
    canViewSubmission: permissions.submissionPermissions.includes("submission.view"),
    canEditSubmission: permissions.submissionPermissions.includes("submission.edit"),
    canUploadFile: permissions.submissionPermissions.includes("submission.file.upload"),
    canDeleteFile: permissions.submissionPermissions.includes("submission.file.delete"),
    refetch: fetchData,
  };
}
