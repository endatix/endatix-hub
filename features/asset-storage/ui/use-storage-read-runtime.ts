"use client";

import { useCallback } from "react";
import { isFormStorageTokenType } from "@/features/form-access";
import type { StorageReadRuntime } from "../infrastructure/storage-read-runtime";
import { useOptionalDesignerRuntime } from "@/lib/designer-runtime";
import { useOptionalFormRuntime } from "@/lib/form-runtime/form-runtime.context";

export interface UseStorageReadRuntimeOptions {
  /** Fallback form id when no FormRuntime state (public survey). */
  formId?: string;
  getSubmissionId?: () => string | undefined;
  /** Creator: scoped form id when itemType is form. */
  creatorFormId?: string;
  /** Creator: scoped template id when itemType is template. */
  creatorTemplateId?: string;
  /** When true, returns null unless DesignerRuntimeProvider is present. */
  hubOnly?: boolean;
}

/**
 * Resolves storage API policy from React runtime roots (DesignerRuntime -> hub, FormRuntime -> public).
 */
export function useStorageReadRuntime(
  options: UseStorageReadRuntimeOptions = {},
): () => StorageReadRuntime | null {
  const {
    formId: fallbackFormId,
    getSubmissionId,
    creatorFormId,
    creatorTemplateId,
    hubOnly = false,
  } = options;

  const formRuntime = useOptionalFormRuntime();
  const designerRuntime = useOptionalDesignerRuntime();

  return useCallback((): StorageReadRuntime | null => {
    if (hubOnly && !designerRuntime) {
      return null;
    }

    if (designerRuntime) {
      const scope = designerRuntime.stateRef.current;
      return {
        policyName: "hub",
        formId: creatorFormId ?? scope.formId ?? fallbackFormId,
        templateId: creatorTemplateId ?? scope.templateId,
        submissionId: scope.submissionId ?? getSubmissionId?.(),
      };
    }

    const state = formRuntime?.stateRef.current;
    if (state?.formId) {
      return {
        policyName: "public",
        formId: state.formId,
        submissionId: state.submissionId ?? getSubmissionId?.(),
        token: state.token,
        ...(state.tokenType && isFormStorageTokenType(state.tokenType)
          ? { tokenType: state.tokenType }
          : {}),
      };
    }

    if (fallbackFormId) {
      return {
        policyName: "public",
        formId: fallbackFormId,
        submissionId: getSubmissionId?.(),
      };
    }

    return null;
  }, [
    designerRuntime,
    formRuntime,
    fallbackFormId,
    getSubmissionId,
    creatorFormId,
    creatorTemplateId,
    hubOnly,
  ]);
}
