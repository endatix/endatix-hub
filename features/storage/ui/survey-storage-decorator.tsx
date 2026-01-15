"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { SurveyModel } from "survey-core";
import { ReadTokensResult } from "../types";
import { useStorageView } from "../use-cases/view-files/use-storage-view.hook";
import { useStorageUpload } from "../use-cases/upload-files/use-storage-upload.hook";
import { useStorageConfig } from "../infrastructure";

interface SurveyStorageDecoratorProps {
  model: SurveyModel;
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
  formId: string;
  submissionId?: string;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  children: React.ReactNode;
}

/**
 * Decorator component that encapsulates private storage logic before model is passed to the Survey component for rendering.
 */
export function SurveyStorageDecorator({
  model,
  readTokenPromises,
  formId,
  submissionId,
  onSubmissionIdChange,
  children,
}: SurveyStorageDecoratorProps) {
  if (!readTokenPromises) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={children}>
      <StorageInner
        model={model}
        promises={readTokenPromises}
        formId={formId}
        submissionId={submissionId}
        onSubmissionIdChange={onSubmissionIdChange}
      >
        {children}
      </StorageInner>
    </Suspense>
  );
}

interface StorageInnerProps {
  model: SurveyModel;
  promises: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
  formId: string;
  submissionId?: string;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  children: React.ReactNode;
}

function StorageInner({
  model,
  promises,
  formId,
  submissionId,
  onSubmissionIdChange,
  children,
}: StorageInnerProps) {
  const storageConfig = useStorageConfig();
  const { setModelMetadata, registerViewHandlers } = useStorageView(promises);
  const { registerUploadHandlers } = useStorageUpload({
    surveyModel: model,
    formId,
    submissionId,
    onSubmissionIdChange,
    readTokenPromises: promises,
  });
  const [isDecorated, setIsDecorated] = useState(false);

  useMemo(() => {
    setModelMetadata(model);
  }, [model, setModelMetadata]);

  useEffect(() => {
    if (!storageConfig?.isEnabled) {
      setIsDecorated(true);
      return;
    }

    const unregisterUploadHandlers = registerUploadHandlers(model);

    if (!storageConfig?.isPrivate) {
      setIsDecorated(true);
      return;
    }

    const unregisterViewHandlers = registerViewHandlers(model);
    setIsDecorated(true);

    return () => {
      unregisterUploadHandlers?.();
      unregisterViewHandlers?.();
    };
  }, [model, storageConfig, registerUploadHandlers, registerViewHandlers]);

  if (!isDecorated) {
    return null;
  }

  return <>{children}</>;
}
