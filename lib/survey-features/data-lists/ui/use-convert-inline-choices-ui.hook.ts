"use client";

import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { registerConvertChoicesUiDeps } from "../conversion/convert-inline-choices-deps";
import type { ConvertInlineChoicesDialogProps } from "./convert-inline-choices-dialog";

export interface UseConvertInlineChoicesUiOptions {
  dataLists: DataList[] | null;
  refetchDataLists: () => Promise<void>;
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
  dataLists,
  refetchDataLists,
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

  useEffect(() => {
    registerConvertChoicesUiDeps({
      getDataListNames: () =>
        (dataLists ?? []).map((dataList) => dataList.name),
      refreshDataLists: () => refetchDataLists(),
      markFormModified,
      confirmConvertInlineChoices: requestConfirmation,
    });

    return () => registerConvertChoicesUiDeps(null);
  }, [dataLists, markFormModified, refetchDataLists, requestConfirmation]);

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
