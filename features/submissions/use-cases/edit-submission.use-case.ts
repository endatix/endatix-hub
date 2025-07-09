"use server";

import { updateSubmission } from "@/services/api";
import { SubmissionData } from "../types";

export const editSubmissionUseCase = async (
  formId: string,
  submissionId: string,
  submissionData: SubmissionData,
) => {
  const submission = await updateSubmission(
    formId,
    submissionId,
    submissionData,
  );
  return submission;
};
