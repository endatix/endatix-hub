"use client";

import { searchDataListsForPickerAction } from "@/features/data-lists/view-lists/search-data-lists-for-picker.action";
import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { applyDataListBindingOnQuestion } from "@/lib/survey-features/data-lists/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { registerConvertChoicesUiDeps } from "../conversion/convert-inline-choices-deps";
import { refreshPropertyGridLazyChoicesForCreator } from "../infrastructure/property-grid-lazy-choice-registry";
import { syncDataListPropertyGridAfterBinding } from "../infrastructure/creator-property-grid-sync";
import type { ConvertInlineChoicesDialogProps } from "./convert-inline-choices-dialog";

export interface UseConvertInlineChoicesUiOptions {
  creator: SurveyCreatorModel | null;
  markFormModified: () => void;
}

export interface UseConvertInlineChoicesUiResult {
  dialog: ConvertInlineChoicesDialogProps;
}

interface ConvertInlineChoicesDialogState {
  isOpen: boolean;
  name: string;
  errorMessage?: string;
}

export function useConvertInlineChoicesUi({
  creator,
  markFormModified,
}: UseConvertInlineChoicesUiOptions): UseConvertInlineChoicesUiResult {
  const confirmResolverRef = useRef<((value: string | null) => void) | null>(
    null,
  );
  const confirmPromiseRef = useRef<Promise<string | null> | null>(null);
  const [dialogState, setDialogState] =
    useState<ConvertInlineChoicesDialogState>({ isOpen: false, name: "" });

  const resolvePendingConfirmation = useCallback((value: string | null) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    confirmPromiseRef.current = null;
    resolve?.(value);
  }, []);

  const closeDialog = useCallback(
    (value: string | null) => {
      resolvePendingConfirmation(value);
      setDialogState({
        isOpen: false,
        name: "",
        errorMessage: undefined,
      });
    },
    [resolvePendingConfirmation],
  );

  const requestConfirmation = useCallback(
    (input?: {
      initialName: string;
      errorMessage?: string;
    }): Promise<string | null> => {
      if (confirmPromiseRef.current) {
        return confirmPromiseRef.current;
      }

      const promise = new Promise<string | null>((resolve) => {
        confirmResolverRef.current = resolve;
        setDialogState({
          isOpen: true,
          name: input?.initialName ?? "",
          errorMessage: input?.errorMessage,
        });
      });

      confirmPromiseRef.current = promise;
      return promise;
    },
    [],
  );

  const handleNameChange = useCallback((name: string) => {
    setDialogState((prev) => ({
      ...prev,
      name,
      errorMessage: undefined,
    }));
  }, []);

  const searchDataListNames = useCallback(async (query: string) => {
    const result = await searchDataListsForPickerAction({
      search: query,
      page: 1,
      pageSize: 25,
    });
    if (Result.isError(result)) {
      return [];
    }

    return result.value.items.map((item) => item.name);
  }, []);

  const completeDataListBinding = useCallback(
    (question: Question, created: Pick<DataList, "id" | "name">) => {
      applyDataListBindingOnQuestion(question, String(created.id));
      syncDataListPropertyGridAfterBinding(creator, question);
      if (creator) {
        refreshPropertyGridLazyChoicesForCreator(creator);
      }
    },
    [creator],
  );

  const refreshDataLists = useCallback(async () => {
    if (creator) {
      refreshPropertyGridLazyChoicesForCreator(creator);
    }
  }, [creator]);

  useEffect(() => {
    registerConvertChoicesUiDeps({
      searchDataListNames,
      refreshDataLists,
      completeDataListBinding,
      markFormModified,
      confirmConvertInlineChoices: requestConfirmation,
    });

    return () => registerConvertChoicesUiDeps(null);
  }, [
    completeDataListBinding,
    markFormModified,
    refreshDataLists,
    requestConfirmation,
    searchDataListNames,
  ]);

  useEffect(() => {
    return () => resolvePendingConfirmation(null);
  }, [resolvePendingConfirmation]);

  const dialog = useMemo<ConvertInlineChoicesDialogProps>(
    () => ({
      open: dialogState.isOpen,
      name: dialogState.name,
      errorMessage: dialogState.errorMessage,
      onOpenChange: (open) => {
        if (!open) {
          closeDialog(null);
        }
      },
      onNameChange: handleNameChange,
      onCancel: () => closeDialog(null),
      onConfirm: () => closeDialog(dialogState.name),
    }),
    [closeDialog, dialogState, handleNameChange],
  );

  return { dialog };
}
